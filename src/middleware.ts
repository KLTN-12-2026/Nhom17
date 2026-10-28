//src\middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;

  // 1. Nếu người dùng đã đăng nhập mà cố tình vào trang Đăng nhập / Đăng ký
  // -> Tự động chuyển hướng về Dashboard tương ứng với vai trò của họ
  if (token && (pathname === "/auth/login" || pathname === "/auth/register")) {
    if (token.role === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (token.role === "instructor") {
      return NextResponse.redirect(new URL("/instructor", req.url));
    }
    return NextResponse.redirect(new URL("/student", req.url));
  }

  // 2. Chuyển hướng thông minh tại "/dashboard" về đúng phân hệ theo vai trò
  if (pathname === "/dashboard") {
    if (!token) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (token.role === "instructor") {
      return NextResponse.redirect(new URL("/instructor", req.url));
    }
    return NextResponse.redirect(new URL("/student", req.url));
  }

  // 3. Phân hệ Admin: Bắt buộc đăng nhập và role === "admin"
  if (pathname.startsWith("/admin")) {
    if (!token) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // 4. Phân hệ Instructor (Giáo viên): Bắt buộc đăng nhập và role === "instructor" hoặc "admin"
  if (pathname.startsWith("/instructor")) {
    if (!token) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role !== "instructor" && token.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // 5. Phân hệ Student (Học viên): Bắt buộc đã đăng nhập
  if (pathname.startsWith("/student")) {
    if (!token) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/instructor/:path*",
    "/student/:path*",
    "/dashboard/:path*",
    "/auth/login",
    "/auth/register",
  ],
};
