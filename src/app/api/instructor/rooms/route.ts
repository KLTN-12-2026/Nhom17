import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { Exam, ExamAttempt, ExamRoom } from "@/models";
import { finalizeAllExpiredRooms } from "@/lib/exam-grading";

const createRoomSchema = z.object({
  exam_id: z.string().min(1, "Vui lòng chọn đề thi"),
  room_code: z
    .string()
    .trim()
    .max(20, "Mã phòng thi tối đa 20 ký tự")
    .optional(),
  duration_minutes: z.coerce.number().int().min(1).max(480).optional(),
});

function generateRandomRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PQP${suffix}`;
}

/**
 * GET /api/instructor/rooms
 * Lấy danh sách phòng thi của giảng viên (Admin xem tất cả) kèm thống kê
 */
export async function GET(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();

    const teacherFilter: Record<string, unknown> =
      user.role === "admin"
        ? {}
        : { teacher_id: new mongoose.Types.ObjectId(user.id) };

    // Tự động đóng các phòng đã quá thời gian kết thúc
    await finalizeAllExpiredRooms(teacherFilter);

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const queryFilter: Record<string, unknown> = { ...teacherFilter };
    if (
      statusFilter &&
      ["waiting", "in_progress", "finished"].includes(statusFilter)
    ) {
      queryFilter.status = statusFilter;
    }

    const rooms = await ExamRoom.find(queryFilter)
      .populate({
        path: "exam_id",
        select:
          "title duration_minutes total_questions max_score pass_score subject_id",
        populate: {
          path: "subject_id",
          select: "subject_name code",
        },
      })
      .populate("teacher_id", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Lấy số bài đã nộp cho mỗi phòng
    const roomIds = rooms.map((r) => r._id);
    const submittedCounts = await ExamAttempt.aggregate([
      {
        $match: {
          room_id: { $in: roomIds },
          status: { $in: ["submitted", "timed_out"] },
        },
      },
      { $group: { _id: "$room_id", count: { $sum: 1 } } },
    ]);

    const submittedMap = new Map<string, number>();
    for (const item of submittedCounts) {
      submittedMap.set(String(item._id), item.count);
    }

    const formattedRooms = rooms.map((room) => ({
      ...room,
      _id: String(room._id),
      candidates_count: Array.isArray(room.candidates)
        ? room.candidates.length
        : 0,
      submitted_count: submittedMap.get(String(room._id)) || 0,
    }));

    const allRoomsForStats =
      statusFilter && statusFilter !== "all"
        ? await ExamRoom.find(teacherFilter).select("status").lean()
        : rooms;

    const stats = {
      total: allRoomsForStats.length,
      waiting: allRoomsForStats.filter((r) => r.status === "waiting").length,
      in_progress: allRoomsForStats.filter((r) => r.status === "in_progress")
        .length,
      finished: allRoomsForStats.filter((r) => r.status === "finished").length,
    };

    return NextResponse.json({
      success: true,
      rooms: formattedRooms,
      stats,
    });
  } catch (error) {
    console.error("Lỗi khi tải danh sách phòng thi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải danh sách phòng thi" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/instructor/rooms
 * Tạo phòng thi trực tuyến mới từ đề thi đã xuất bản
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const body = await request.json();
    const parsed = createRoomSchema.parse(body);

    if (!mongoose.Types.ObjectId.isValid(parsed.exam_id)) {
      return NextResponse.json(
        { success: false, message: "Mã đề thi không hợp lệ" },
        { status: 400 }
      );
    }

    const exam = await Exam.findById(parsed.exam_id).lean();
    if (!exam) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đề thi đã chọn" },
        { status: 404 }
      );
    }

    if (
      user.role !== "admin" &&
      String(exam.created_by) !== String(user.id)
    ) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền mở phòng cho đề thi này" },
        { status: 403 }
      );
    }

    if (!exam.is_published) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Đề thi đang ở trạng thái Bản nháp. Vui lòng xuất bản đề thi trước khi mở phòng thi.",
        },
        { status: 400 }
      );
    }

    if (!exam.questions || exam.questions.length === 0) {
      return NextResponse.json(
        { success: false, message: "Đề thi chưa có câu hỏi nào" },
        { status: 400 }
      );
    }

    let finalRoomCode = parsed.room_code
      ? parsed.room_code.trim().toUpperCase().replace(/\s+/g, "-")
      : "";

    if (finalRoomCode) {
      if (!/^[A-Z0-9_-]{3,20}$/.test(finalRoomCode)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Mã phòng chỉ được chứa chữ cái không dấu, số, dấu gạch ngang (-) hoặc gạch dưới (_) từ 3-20 ký tự",
          },
          { status: 400 }
        );
      }

      const duplicate = await ExamRoom.findOne({ room_code: finalRoomCode }).lean();
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: `Mã phòng "${finalRoomCode}" đã tồn tại. Vui lòng chọn mã khác.`,
          },
          { status: 409 }
        );
      }
    } else {
      // Tự sinh mã phòng không trùng
      let attempts = 0;
      do {
        finalRoomCode = generateRandomRoomCode();
        const exists = await ExamRoom.exists({ room_code: finalRoomCode });
        if (!exists) break;
        attempts += 1;
      } while (attempts < 10);
    }

    const durationMinutes = parsed.duration_minutes || exam.duration_minutes || 45;
    const now = new Date();
    const estimatedEnd = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const newRoom = await ExamRoom.create({
      room_code: finalRoomCode,
      exam_id: exam._id,
      teacher_id: new mongoose.Types.ObjectId(user.id),
      start_time: now,
      end_time: estimatedEnd,
      status: "waiting",
      candidates: [],
    });

    const populatedRoom = await ExamRoom.findById(newRoom._id)
      .populate({
        path: "exam_id",
        select:
          "title duration_minutes total_questions max_score pass_score subject_id",
        populate: {
          path: "subject_id",
          select: "subject_name code",
        },
      })
      .populate("teacher_id", "name email")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: `Đã tạo phòng thi trực tuyến với mã ${finalRoomCode}!`,
        room: populatedRoom,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message || "Dữ liệu tạo phòng không hợp lệ",
        },
        { status: 400 }
      );
    }
    console.error("Lỗi khi tạo phòng thi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tạo phòng thi. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}

