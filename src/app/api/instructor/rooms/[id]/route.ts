import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { Exam, ExamAttempt, ExamRoom } from "@/models";
import {
  finalizeRoomAndPendingAttempts,
  syncCandidatesConnectionStatus,
} from "@/lib/exam-grading";

const patchRoomSchema = z.object({
  action: z.enum(["start", "finish"]),
});

/**
 * GET /api/instructor/rooms/[id]
 * Lấy chi tiết phòng thi, danh sách thí sinh và tiến độ làm bài thời gian thực
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Mã phòng thi không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    const roomDoc = await ExamRoom.findById(id);
    if (!roomDoc) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phòng thi" },
        { status: 404 }
      );
    }

    if (
      user.role !== "admin" &&
      String(roomDoc.teacher_id) !== String(user.id)
    ) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền xem phòng thi này" },
        { status: 403 }
      );
    }

    // Tự động chốt phòng & chấm bài nếu đã quá giờ
    await finalizeRoomAndPendingAttempts(roomDoc);
    // Đánh dấu thí sinh mất kết nối nếu quá 12 giây không có tín hiệu
    await syncCandidatesConnectionStatus(roomDoc);

    const populatedRoom = await ExamRoom.findById(id)
      .populate({
        path: "exam_id",
        select:
          "title duration_minutes total_questions max_score pass_score subject_id shuffle_questions shuffle_options allow_view_result_immediately",
        populate: {
          path: "subject_id",
          select: "subject_name code",
        },
      })
      .populate("teacher_id", "name email")
      .populate("candidates.user_id", "name email")
      .lean();

    const attempts = await ExamAttempt.find({ room_id: roomDoc._id })
      .select(
        "user_id status score total_correct total_wrong start_time submit_time duration_seconds answers"
      )
      .lean();

    const attemptsByStudent: Record<
      string,
      {
        attempt_id: string;
        status: string;
        answered_count: number;
        total_questions: number;
        score: number;
        total_correct: number;
        total_wrong: number;
        start_time: Date;
        submit_time: Date | null;
        duration_seconds: number;
      }
    > = {};

    for (const att of attempts) {
      const answeredCount = (att.answers || []).filter(
        (a: { selected_option_id?: unknown }) => Boolean(a.selected_option_id)
      ).length;
      attemptsByStudent[String(att.user_id)] = {
        attempt_id: String(att._id),
        status: att.status,
        answered_count: answeredCount,
        total_questions: (att.answers || []).length,
        score: att.score || 0,
        total_correct: att.total_correct || 0,
        total_wrong: att.total_wrong || 0,
        start_time: att.start_time,
        submit_time: att.submit_time || null,
        duration_seconds: att.duration_seconds || 0,
      };
    }

    return NextResponse.json({
      success: true,
      room: populatedRoom,
      attemptsByStudent,
      server_now: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Lỗi khi tải chi tiết phòng thi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải chi tiết phòng thi" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/instructor/rooms/[id]
 * Điều phối trạng thái phòng thi: "start" (Bắt đầu làm bài) | "finish" (Thu bài & Kết thúc)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID phòng thi không hợp lệ" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = patchRoomSchema.parse(body);

    await connectDB();

    const room = await ExamRoom.findById(id);
    if (!room) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phòng thi" },
        { status: 404 }
      );
    }

    if (
      user.role !== "admin" &&
      String(room.teacher_id) !== String(user.id)
    ) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền điều khiển phòng thi này" },
        { status: 403 }
      );
    }

    if (action === "start") {
      if (room.status === "finished") {
        return NextResponse.json(
          { success: false, message: "Ca thi này đã kết thúc, không thể bắt đầu lại." },
          { status: 400 }
        );
      }
      if (room.status === "in_progress") {
        return NextResponse.json({
          success: true,
          message: "Phòng thi đang diễn ra.",
          room,
        });
      }

      const exam = await Exam.findById(room.exam_id)
        .select("duration_minutes")
        .lean();
      const configuredDurationMs = Math.max(
        60_000,
        new Date(room.end_time).getTime() - new Date(room.start_time).getTime()
      );
      const fallbackDurationMs = ((exam?.duration_minutes as number) || 45) * 60 * 1000;
      const durationMs =
        Number.isFinite(configuredDurationMs) && configuredDurationMs >= 60_000
          ? configuredDurationMs
          : fallbackDurationMs;

      const now = new Date();
      room.status = "in_progress";
      room.start_time = now;
      room.end_time = new Date(now.getTime() + durationMs);
      await room.save();

      return NextResponse.json({
        success: true,
        message: "Đã phát đề thi và bắt đầu tính giờ!",
        room,
        server_now: now.toISOString(),
      });
    }

    // action === "finish"
    if (room.status === "finished") {
      return NextResponse.json({
        success: true,
        message: "Ca thi đã kết thúc trước đó.",
        room,
      });
    }

    await finalizeRoomAndPendingAttempts(room, { forceFinish: true });

    return NextResponse.json({
      success: true,
      message: "Đã thu bài toàn bộ thí sinh và kết thúc ca thi!",
      room,
      server_now: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Hành động điều khiển phòng thi không hợp lệ" },
        { status: 400 }
      );
    }
    console.error("Lỗi khi điều khiển phòng thi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật trạng thái phòng thi" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/instructor/rooms/[id]
 * Xóa phòng thi (nếu chưa diễn ra hoặc đã kết thúc)
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID phòng thi không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    const room = await ExamRoom.findById(id);
    if (!room) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phòng thi" },
        { status: 404 }
      );
    }

    if (
      user.role !== "admin" &&
      String(room.teacher_id) !== String(user.id)
    ) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền xóa phòng thi này" },
        { status: 403 }
      );
    }

    if (room.status === "in_progress") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phòng thi đang diễn ra. Vui lòng kết thúc ca thi trước khi xóa.",
        },
        { status: 400 }
      );
    }

    const submittedCount = await ExamAttempt.countDocuments({
      room_id: room._id,
      status: { $in: ["submitted", "timed_out"] },
    });

    if (submittedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phòng thi đã có học viên nộp bài, không thể xóa để bảo toàn dữ liệu điểm số.",
        },
        { status: 400 }
      );
    }

    await ExamAttempt.deleteMany({ room_id: room._id });
    await ExamRoom.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Đã xóa phòng thi thành công.",
    });
  } catch (error) {
    console.error("Lỗi khi xóa phòng thi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể xóa phòng thi" },
      { status: 500 }
    );
  }
}

