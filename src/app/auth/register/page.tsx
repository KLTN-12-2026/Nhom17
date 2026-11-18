//src\app\auth\register\page.tsx
import AuthShell from "@/components/auth/auth-shell";
import RegisterForm from "@/components/auth/register-form";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản | PQP AI-Quizz — Trung Tâm Luyện Thi Thông Minh",
  description: "Đăng ký tài khoản học viên hoặc giảng viên tại Trung tâm luyện thi trắc nghiệm trực tuyến tích hợp AI.",
};

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-slate-500">
            Loading form...
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
