//src\app\auth\login\page.tsx
import LoginForm from "@/components/auth/login-form";
import AuthShell from "@/components/auth/auth-shell";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập | PQP AI-Quizz — Trung Tâm Luyện Thi Thông Minh",
  description: "Đăng nhập hệ thống khảo thí và luyện thi trắc nghiệm trực tuyến tích hợp trí tuệ nhân tạo.",
};

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-slate-500">
            Loading form...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
