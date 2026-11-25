import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { ExamAttempt, ExamRoom } from "@/models";
import { finalizeRoomAndPendingAttempts } from "@/lib/exam-grading";

const singleAnswerSchema = z.object({
  question_id: z.string().min(1),
  selected_option_id: z.string().nullable(),
  client_timestamp: z.number().optional(),
});

const saveAnswerSchema = z.union([
  singleAnswerSchema,
  z.object({
    answers: z.array(singleAnswerSchema).min(1),
  }),
]);

/**
 * PATCH /api/student/exam/[roomId]/save-answer
 * Tự động lưu tạm (Auto-save) đáp án học viên vừa chọn vào CSDL.
 * Chống ghi đè ngược thứ tự nhờ client_timestamp và cập nhật heartbeat kết nối.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  if (user.role !== "student") {
    return NextResponse.json(
      { success: false, message: "Chỉ Học viên mới có thể lưu đáp án bài thi." },
      { status: 403 }
    );
  }

  try {
    const { roomId } = await params;
    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      return NextResponse.json(
        { success: false, message: "ID phòng thi không hợp lệ" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = saveAnswerSchema.parse(body);
    const updates = "answers" in parsed ? parsed.answers : [parsed];

    await connectDB();

    const roomDoc = await ExamRoom.findById(roomId);
    if (!roomDoc) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phòng thi" },
        { status: 404 }
      );
    }

    // Kiểm tra xem phòng đã hết giờ chưa (cộng ân hạn mạng 3s)
    const now = new Date();
    const isExpired = now.getTime() > new Date(roomDoc.end_time).getTime() + 3000;
    if (roomDoc.status === "finished" || isExpired) {
      await finalizeRoomAndPendingAttempts(roomDoc);
      return NextResponse.json(
        {
          success: false,
          timed_out: true,
          message: "Thời gian làm bài đã hết. Hệ thống đã khóa bài thi.",
        },
        { status: 403 }
      );
    }

    if (roomDoc.status !== "in_progress") {
      return NextResponse.json(
        { success: false, message: "Phòng thi chưa bắt đầu." },
        { status: 403 }
      );
    }

    const userObjId = new mongoose.Types.ObjectId(user.id);
    const attempt = await ExamAttempt.findOne({
      room_id: roomDoc._id,
      user_id: userObjId,
    });

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phiên làm bài" },
        { status: 404 }
      );
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        {
          success: false,
          already_submitted: true,
          message: "Bài thi đã được nộp, không thể chỉnh sửa đáp án.",
        },
        { status: 403 }
      );
    }

    const answerIndexMap = new Map<string, number>();
    for (let i = 0; i < attempt.answers.length; i++) {
      answerIndexMap.set(String(attempt.answers[i].question_id), i);
    }

    for (const item of updates) {
      if (!mongoose.Types.ObjectId.isValid(item.question_id)) continue;
      const optObjId =
        item.selected_option_id &&
        mongoose.Types.ObjectId.isValid(item.selected_option_id)
          ? new mongoose.Types.ObjectId(item.selected_option_id)
          : null;

      const incomingTime =
        typeof item.client_timestamp === "number" &&
        Number.isFinite(item.client_timestamp)
          ? new Date(item.client_timestamp)
          : now;

      const idx = answerIndexMap.get(item.question_id);
      if (idx !== undefined) {
        const currentEntry = attempt.answers[idx];
        // Chỉ so sánh timestamp nếu câu này đã từng được chọn đáp án trước đó (tránh lệch clock khi lần đầu chọn)
        if (
          currentEntry.selected_option_id &&
          currentEntry.answered_at &&
          incomingTime.getTime() < new Date(currentEntry.answered_at).getTime()
        ) {
          continue;
        }
        attempt.answers[idx].selected_option_id = optObjId;
        attempt.answers[idx].answered_at = incomingTime;
      } else {
        attempt.answers.push({
          question_id: new mongoose.Types.ObjectId(item.question_id),
          selected_option_id: optObjId,
          answered_at: incomingTime,
        });
        answerIndexMap.set(item.question_id, attempt.answers.length - 1);
      }
    }

    await attempt.save();

    // Cập nhật last_seen_at trong phòng thi
    const candidateIdx = roomDoc.candidates.findIndex(
      (c: { user_id: mongoose.Types.ObjectId }) =>
        String(c.user_id) === String(userObjId)
    );
    if (candidateIdx >= 0) {
      if (roomDoc.candidates[candidateIdx].connection_status !== "submitted") {
        roomDoc.candidates[candidateIdx].connection_status = "connected";
      }
      roomDoc.candidates[candidateIdx].last_seen_at = now;
      await roomDoc.save();
    }

    return NextResponse.json({
      success: true,
      saved_at: now.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu đáp án không hợp lệ" },
        { status: 400 }
      );
    }
    console.error("Lỗi auto-save đáp án:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lưu tạm đáp án" },
      { status: 500 }
    );
  }
}
