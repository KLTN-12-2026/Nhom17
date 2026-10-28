import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { User } from "@/models/User";

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100),
    phone_number: z.string().trim().max(20, "Số điện thoại không được vượt quá 20 ký tự"),
    school_name: z
      .string()
      .trim()
      .max(150, "Tên trường không được vượt quá 150 ký tự"),
    date_of_birth: z
      .string()
      .trim()
      .refine((value) => {
        if (!value) return true;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

        const parsedDate = new Date(`${value}T00:00:00.000Z`);
        return (
          !Number.isNaN(parsedDate.getTime()) &&
          parsedDate.toISOString().slice(0, 10) === value
        );
      }, "Ngày sinh không hợp lệ.")
      .refine(
        (value) => !value || value <= new Date().toISOString().slice(0, 10),
        "Ngày sinh không được ở tương lai."
      ),
  })
  .strict();

export async function PUT(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
  ]);
  if (errorResponse || !user) {
    return errorResponse;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Dữ liệu gửi lên không phải JSON hợp lệ." },
      { status: 400 }
    );
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Thông tin cá nhân không hợp lệ.",
      },
      { status: 400 }
    );
  }

  await connectDB();
  const updatedUser = await User.findByIdAndUpdate(
    user.id,
    {
      $set: {
        name: parsed.data.name,
        phone_number: parsed.data.phone_number,
        school_name: parsed.data.school_name,
        date_of_birth: parsed.data.date_of_birth
          ? new Date(`${parsed.data.date_of_birth}T00:00:00.000Z`)
          : null,
      },
    },
    { new: true, runValidators: true }
  ).select("name email phone_number date_of_birth school_name role");

  if (!updatedUser) {
    return NextResponse.json(
      { success: false, error: "Không tìm thấy tài khoản của bạn." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Thông tin cá nhân đã được cập nhật.",
    profile: {
      name: updatedUser.name,
      email: updatedUser.email,
      phone_number: updatedUser.phone_number ?? "",
      school_name: updatedUser.school_name ?? "",
      date_of_birth: updatedUser.date_of_birth
        ? updatedUser.date_of_birth.toISOString().slice(0, 10)
        : "",
      role: updatedUser.role,
    },
  });
}
