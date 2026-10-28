//src\lib\auth-guards.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export type UserRole = "admin" | "instructor" | "student";

export interface AuthenticatedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
}

/**
 * Lấy session hiện tại ở phía Server Component hoặc Server Action
 */
export async function getServerAuthSession() {
  return await getServerSession(authOptions);
}

/**
 * Lấy thông tin người dùng hiện tại, trả về null nếu chưa đăng nhập
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return null;
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: session.user.role as UserRole,
  };
}

/**
 * Kiểm tra xác thực cho API Routes.
 * Trả về { user } nếu hợp lệ, hoặc { errorResponse } chứa NextResponse (401/403) nếu không hợp lệ.
 */
export async function checkApiAuthorization(allowedRoles?: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Vui lòng đăng nhập để thực hiện thao tác này.",
        },
        { status: 401 },
      ),
    };
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: `Forbidden: Tài khoản của bạn [${user.role}] không có quyền truy cập tài nguyên này. Yêu cầu quyền: [${allowedRoles.join(", ")}].`,
        },
        { status: 403 },
      ),
    };
  }

  return { user, errorResponse: null };
}

/**
 * Kiểm tra xem người dùng có quyền cụ thể hay không (helper logic)
 */
export function hasRequiredRole(
  userRole: UserRole | undefined,
  allowedRoles: UserRole[],
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}
