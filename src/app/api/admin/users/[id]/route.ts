import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { adminUpdateUserSchema } from "@/lib/validations/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/users/[id]
 * - Cập nhật thông tin cơ bản của người dùng (họ tên, số điện thoại, mật khẩu)
 * - Phân quyền và thay đổi vai trò (admin, instructor, student)
 * - Khóa hoặc mở khóa trạng thái tài khoản
 * - Ràng buộc: Chặn Admin tự khóa tài khoản chính mình và chặn hạ quyền Admin duy nhất
 */
export async function PATCH(req: Request, context: RouteContext) {
  const { user: currentUser, errorResponse } = await checkApiAuthorization(["admin"]);
  if (errorResponse) {
    return errorResponse;
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const data = adminUpdateUserSchema.parse(body);

    await connectDB();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy người dùng này trong hệ thống!" },
        { status: 404 }
      );
    }

    // RÀNG BUỘC 1: Admin không thể tự khóa tài khoản của chính mình
    if (currentUser?.id === id && data.status === "disabled") {
      return NextResponse.json(
        { success: false, error: "Bạn không thể tự khóa tài khoản của chính mình!" },
        { status: 400 }
      );
    }

    // RÀNG BUỘC 2: Không được hạ quyền của Admin nếu hệ thống chỉ còn 1 Admin duy nhất
    if (targetUser.role === "admin" && data.role && data.role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: "Hệ thống phải duy trì ít nhất một Quản trị viên!" },
          { status: 400 }
        );
      }
    }

    // Chuẩn bị dữ liệu cập nhật
    const updatePayload: Record<string, unknown> = {};

    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.phone_number !== undefined) updatePayload.phone_number = data.phone_number;
    if (data.role !== undefined) updatePayload.role = data.role;
    if (data.status !== undefined) {
      updatePayload.status = data.status;
      updatePayload.is_active = data.status === "active";
    }

    // Nếu có đổi mật khẩu mới
    if (data.password && data.password.trim().length > 0) {
      updatePayload.password = await bcrypt.hash(data.password, 12);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updatePayload, { new: true })
      .select("name email phone_number role status is_active createdAt")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Cập nhật tài khoản thành công!",
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "Dữ liệu cập nhật không hợp lệ" },
        { status: 400 }
      );
    }

    console.error("Admin Update User Error:", error);
    return NextResponse.json(
      { success: false, error: "Đã có lỗi xảy ra khi cập nhật tài khoản." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * - Xóa tài khoản người dùng khỏi cơ sở dữ liệu
 * - Ràng buộc: Chặn Admin tự xóa tài khoản chính mình và chặn xóa Admin duy nhất
 */
export async function DELETE(_req: Request, context: RouteContext) {
  const { user: currentUser, errorResponse } = await checkApiAuthorization(["admin"]);
  if (errorResponse) {
    return errorResponse;
  }

  const { id } = await context.params;

  try {
    await connectDB();

    // RÀNG BUỘC 1: Admin không thể tự xóa tài khoản của chính mình
    if (currentUser?.id === id) {
      return NextResponse.json(
        { success: false, error: "Bạn không thể tự xóa tài khoản của chính mình!" },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy người dùng cần xóa!" },
        { status: 404 }
      );
    }

    // RÀNG BUỘC 2: Không được xóa nếu đây là tài khoản Quản trị viên duy nhất
    if (targetUser.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: "Không thể xóa Quản trị viên duy nhất của hệ thống!" },
          { status: 400 }
        );
      }
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Đã xóa tài khoản [${targetUser.name}] thành công!`,
    });
  } catch (error) {
    console.error("Admin Delete User Error:", error);
    return NextResponse.json(
      { success: false, error: "Đã có lỗi xảy ra khi xóa tài khoản." },
      { status: 500 }
    );
  }
}
