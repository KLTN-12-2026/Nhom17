import z from "zod";

export const registerSchema = z.object({
    name: z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address").toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["student", "instructor"]),
    teacherSecretCode: z.string().optional(),
})

export const loginSchema = z.object({
    email: z.string().trim().email("Invalid email address").toLowerCase(),
    password: z.string().min(1, "Please enter your password"),
})

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .toLowerCase(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Invalid password reset link"),
    password: z.string().min(8,"Password must be at least 8 characters"),
    confirmPassword: z.string().min(1,"Please confirm your password"),
})
.refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2, "Họ và tên tối thiểu 2 ký tự").max(100, "Họ và tên tối đa 100 ký tự"),
  email: z.string().trim().email("Địa chỉ email không hợp lệ").toLowerCase(),
  phone_number: z.string().trim().max(20, "Số điện thoại tối đa 20 ký tự").optional().default(""),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  role: z.enum(["admin", "instructor", "student"], {
    message: "Vai trò phải là admin, instructor hoặc student",
  }),
  status: z.enum(["active", "disabled"]).default("active"),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(2, "Họ và tên tối thiểu 2 ký tự").max(100, "Họ và tên tối đa 100 ký tự").optional(),
  phone_number: z.string().trim().max(20, "Số điện thoại tối đa 20 ký tự").optional(),
  password: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự").optional().or(z.literal("")),
  role: z.enum(["admin", "instructor", "student"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});