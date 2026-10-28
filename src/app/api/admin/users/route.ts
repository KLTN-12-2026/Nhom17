import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { adminCreateUserSchema } from "@/lib/validations/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

/**
 * GET /api/admin/users
 * Lấy danh sách tài khoản kèm bộ lọc tìm kiếm (tên, email, số điện thoại), vai trò và trạng thái
 */
export async function GET(req: Request) {
  const { user, errorResponse } = await checkApiAuthorization(["admin"]);
  if (errorResponse) {
    return errorResponse;
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const role = searchParams.get("role")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";

  await connectDB();

  // Xây dựng điều kiện lọc linh hoạt
  const filter: Record<string, unknown> = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone_number: { $regex: search, $options: "i" } },
    ];
  }

  if (role && ["admin", "instructor", "student"].includes(role)) {
    filter.role = role;
  }

  if (status && ["active", "disabled"].includes(status)) {
    filter.status = status;
  }

  const users = await User.find(filter)
    .select("name email phone_number role status is_active createdAt avatar_url")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    currentUser: {
      id: user?.id,
      role: user?.role,
    },
    total: users.length,
    users,
  });
}

/**
 * POST /api/admin/users
 * Quản trị viên tạo mới tài khoản và trực tiếp cấp quyền (admin, instructor, student)
 */
export async function POST(req: Request) {
  const { errorResponse } = await checkApiAuthorization(["admin"]);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = await req.json();
    const data = adminCreateUserSchema.parse(body);

    await connectDB();

    // Kiểm tra xem email đã tồn tại hay chưa
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Địa chỉ email này đã tồn tại trong hệ thống. Vui lòng chọn email khác!" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const newUser = await User.create({
      name: data.name,
      email: data.email,
      phone_number: data.phone_number || "",
      password: hashedPassword,
      role: data.role,
      status: data.status,
      is_active: data.status === "active",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tạo tài khoản người dùng mới thành công!",
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone_number: newUser.phone_number,
          role: newUser.role,
          status: newUser.status,
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "Dữ liệu nhập không hợp lệ" },
        { status: 400 }
      );
    }

    console.error("Admin Create User Error:", error);
    return NextResponse.json(
      { success: false, error: "Đã có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
