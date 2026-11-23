import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { ExamAttempt, ExamRoom } from "@/models";
import {
  finalizeRoomAndPendingAttempts,
  syncCandidatesConnectionStatus,
} from "@/lib/exam-grading";

/**
 * GET /api/student/rooms/[roomId]/status
 * Kiểm tra trạng thái phòng chờ & đồng bộ tín hiệu kết nối (heartbeat).
 * Bảo mật: yêu cầu học viên đã join bằng mã phòng, không trả danh tính thí sinh khác.
 */
export async function GET(
  _request: Request,
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
      {
        success: false,
        message: "Chỉ tài khoản Học viên mới có thể truy cập trạng thái thi của thí sinh.",
      },
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

    await connectDB();

    const roomDoc = await ExamRoom.findById(roomId);
    if (!roomDoc) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phòng thi" },
        { status: 404 }
      );
    }

    await finalizeRoomAndPendingAttempts(roomDoc);

    const userObjId = new mongoose.Types.ObjectId(user.id);
    const myAttempt = await ExamAttempt.findOne({
      room_id: roomDoc._id,
      user_id: userObjId,
    })
      .select("_id status score total_correct total_wrong submit_time duration_seconds")
      .lean();

    const candidateIdx = roomDoc.candidates.findIndex(
      (c: { user_id: mongoose.Types.ObjectId }) =>
        String(c.user_id) === String(userObjId)
    );

    // Chặn truy cập thẳng bằng URL nếu chưa join qua mã phòng
    if (candidateIdx < 0 && !myAttempt) {
      return NextResponse.json(
        {
          success: false,
          require_join: true,
          message: "Vui lòng nhập mã phòng (Room Code) để tham gia phòng thi.",
        },
        { status: 403 }
      );
    }

    if (candidateIdx >= 0 && roomDoc.status !== "finished") {
      if (roomDoc.candidates[candidateIdx].connection_status !== "submitted") {
        roomDoc.candidates[candidateIdx].connection_status = "connected";
      }
      roomDoc.candidates[candidateIdx].last_seen_at = new Date();
      await roomDoc.save();
    }

    await syncCandidatesConnectionStatus(roomDoc);

    const populatedRoom = await ExamRoom.findById(roomId)
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

    const candidatesCount = Array.isArray(roomDoc.candidates)
      ? roomDoc.candidates.length
      : 0;
    const onlineCount = Array.isArray(roomDoc.candidates)
      ? roomDoc.candidates.filter(
          (c: { connection_status: string }) =>
            c.connection_status === "connected"
        ).length
      : 0;

    return NextResponse.json({
      success: true,
      room: populatedRoom
        ? {
            _id: String(populatedRoom._id),
            room_code: populatedRoom.room_code,
            status: populatedRoom.status,
            start_time: populatedRoom.start_time,
            end_time: populatedRoom.end_time,
            teacher_id: populatedRoom.teacher_id,
            exam_id: populatedRoom.exam_id,
            candidates_count: candidatesCount,
            online_count: onlineCount,
          }
        : null,
      my_attempt: myAttempt
        ? {
            ...myAttempt,
            _id: String(myAttempt._id),
          }
        : null,
      server_now: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái phòng thi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải trạng thái phòng thi" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/rooms/[roomId]/status
 * Ghi nhận tín hiệu ngắt kết nối (khi đóng tab / rời phòng) qua navigator.sendBeacon
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { user, errorResponse } = await checkApiAuthorization(["student"]);
  if (errorResponse) return errorResponse;

  try {
    const { roomId } = await params;
    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    let action = "";
    try {
      const rawText = await request.text();
      if (rawText) {
        const parsed = JSON.parse(rawText) as { action?: string };
        action = parsed.action || "";
      }
    } catch {
      action = "";
    }

    if (action !== "disconnect") {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    await connectDB();

    const roomDoc = await ExamRoom.findById(roomId);
    if (!roomDoc || roomDoc.status === "finished") {
      return NextResponse.json({ success: true });
    }

    const candidateIdx = roomDoc.candidates.findIndex(
      (c: { user_id: mongoose.Types.ObjectId }) =>
        String(c.user_id) === String(user.id)
    );

    if (
      candidateIdx >= 0 &&
      roomDoc.candidates[candidateIdx].connection_status === "connected"
    ) {
      roomDoc.candidates[candidateIdx].connection_status = "disconnected";
      await roomDoc.save();
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
