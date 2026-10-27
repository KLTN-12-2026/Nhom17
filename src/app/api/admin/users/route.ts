import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/users
 * API chỉ dành cho Quản trị viên (admin) - lấy danh sách người dùng trong hệ thống
 */
export async function GET() {
  const { user, errorResponse } = await checkApiAuthorization(["admin"]);
  if (errorResponse) {
    return errorResponse;
  }

  await connectDB();
  const users = await User.find({})
    .select("name email role status is_active createdAt")
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
