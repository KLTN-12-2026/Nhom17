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