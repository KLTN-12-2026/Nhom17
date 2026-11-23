import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { ExamAttempt, ExamRoom } from "@/models";
import { finalizeRoomAndPendingAttempts } from "@/lib/exam-grading";

const joinRoomSchema = z.object({
  room_code: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã phòng thi")
    .max(20, "Mã phòng thi không hợp lệ"),
});

/**
 * POST /api/student/rooms/join
 * Học viên nhập mã phòng (Room Code) để tham gia phòng thi trực tuyến
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  if (user.role !== "student") {
    return NextResponse.json(
      {
        success: false,
        message:
          "Chỉ tài khoản Học viên mới có thể tham gia làm bài trong phòng thi. Giảng viên/Quản trị viên vui lòng dùng tính năng Thi thử hoặc Điều phối phòng thi.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { room_code } = joinRoomSchema.parse(body);
    const normalizedCode = room_code.trim().toUpperCase();

    await connectDB();

    const roomDoc = await ExamRoom.findOne({ room_code: normalizedCode });
    if (!roomDoc) {
      return NextResponse.json(
        {
          success: false,
          message: `Không tìm thấy phòng thi với mã "${normalizedCode}". Vui lòng kiểm tra lại.`,
        },
        { status: 404 }
      );
    }

    // Kiểm tra tự động đóng phòng nếu đã hết giờ
    await finalizeRoomAndPendingAttempts(roomDoc);

    const userObjId = new mongoose.Types.ObjectId(user.id);

    // Kiểm tra học viên đã nộp bài ở phòng này chưa (ràng buộc chỉ nộp 1 lần)
    const existingAttempt = await ExamAttempt.findOne({
      room_id: roomDoc._id,
      user_id: userObjId,
    })
      .select("_id status score total_correct total_wrong submit_time")
      .lean();

    if (
      existingAttempt &&
      ["submitted", "timed_out", "revoked"].includes(existingAttempt.status)
    ) {
      return NextResponse.json({
        success: true,
        already_submitted: true,
        room_id: String(roomDoc._id),
        room_status: roomDoc.status,
        attempt_id: String(existingAttempt._id),
        message: "Bạn đã hoàn thành và nộp bài cho ca thi này.",
      });
    }

    if (roomDoc.status === "finished") {
      return NextResponse.json(
        {
          success: false,
          message: "Ca thi này đã kết thúc và không còn nhận thêm thí sinh.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Thêm hoặc cập nhật trạng thái kết nối thí sinh trong phòng
    const candidateIdx = roomDoc.candidates.findIndex(
      (c: { user_id: mongoose.Types.ObjectId }) =>
        String(c.user_id) === String(userObjId)
    );

    if (candidateIdx >= 0) {
      if (roomDoc.candidates[candidateIdx].connection_status !== "submitted") {
        roomDoc.candidates[candidateIdx].connection_status = "connected";
      }
      roomDoc.candidates[candidateIdx].last_seen_at = now;
    } else {
      roomDoc.candidates.push({
        user_id: userObjId,
        joined_at: now,
        last_seen_at: now,
        connection_status: "connected",
      });
    }

    await roomDoc.save();

    const populatedRoom = await ExamRoom.findById(roomDoc._id)
      .populate({
        path: "exam_id",
        select:
          "title duration_minutes total_questions max_score pass_score allow_view_result_immediately subject_id",
        populate: {
          path: "subject_id",
          select: "subject_name",
        },
      })
      .populate("teacher_id", "name")
      .lean();

    const onlineCount = Array.isArray(roomDoc.candidates)
      ? roomDoc.candidates.filter(
          (c: { connection_status: string }) =>
            c.connection_status === "connected"
        ).length
      : 0;

    return NextResponse.json({
      success: true,
      already_submitted: false,
      room_id: String(roomDoc._id),
      room_status: roomDoc.status,
      room: populatedRoom
        ? {
            _id: String(populatedRoom._id),
            room_code: populatedRoom.room_code,
            status: populatedRoom.status,
            start_time: populatedRoom.start_time,
            end_time: populatedRoom.end_time,
            teacher_id: populatedRoom.teacher_id,
            exam_id: populatedRoom.exam_id,
            candidates_count: roomDoc.candidates.length,
            online_count: onlineCount,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message || "Mã phòng thi không hợp lệ",
        },
        { status: 400 }
      );
    }
    console.error("Lỗi khi tham gia phòng thi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tham gia phòng thi" },
      { status: 500 }
    );
  }
}
