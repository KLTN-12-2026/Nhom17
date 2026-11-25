//src\app\auth\forgot-password\page.tsx
import AuthShell from "@/components/auth/auth-shell";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Khôi phục mật khẩu | PQP AI-Quizz",
  description: "Khôi phục mật khẩu tài khoản tại Trung tâm luyện thi trắc nghiệm trực tuyến.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
