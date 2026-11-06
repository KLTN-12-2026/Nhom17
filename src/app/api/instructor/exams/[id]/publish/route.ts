import { connectDB } from "@/lib/db";
import { Exam } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

/**
 * PATCH /api/instructor/exams/[id]/publish
 * Bật/tắt nhanh trạng thái Xuất bản của đề thi
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "ID đề thi không hợp lệ" }, { status: 400 });
    }

    await connectDB();
    const exam = await Exam.findById(id);
    if (!exam) {
      return NextResponse.json({ success: false, message: "Không tìm thấy đề thi" }, { status: 404 });
    }

    if (user.role !== "admin" && String(exam.created_by) !== user.id) {
      return NextResponse.json({ success: false, message: "Bạn không có quyền thay đổi trạng thái đề thi này" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const newStatus = typeof body.is_published === "boolean" ? body.is_published : !exam.is_published;

    exam.is_published = newStatus;
    await exam.save();

    return NextResponse.json({
      success: true,
      message: newStatus ? "Đề thi đã được xuất bản công khai!" : "Đề thi đã được chuyển về bản nháp!",
      is_published: newStatus,
    });
  } catch (error) {
    console.error("Lỗi khi chuyển đổi trạng thái đề thi:", error);
    return NextResponse.json({ success: false, message: "Không thể chuyển đổi trạng thái đề thi" }, { status: 500 });
  }
}
