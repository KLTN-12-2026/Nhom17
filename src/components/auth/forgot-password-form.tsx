//src\components\auth\forgot-password-form.tsx
"use client";

import { forgotPasswordSchema } from "@/lib/validations/auth";
import Link from "next/link";
import { useState } from "react";

const genericMessage =
  "Nếu email tồn tại trên hệ thống, liên kết đặt lại mật khẩu sẽ được gửi đến hòm thư của bạn.";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Định dạng email không hợp lệ");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(
          data.message ?? "Không thể xử lý yêu cầu. Vui lòng thử lại sau.",
        );
        return;
      }

      setMessage(data.message ?? genericMessage);
    } catch {
      setError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Quên mật khẩu?</h1>
        <p className="mt-2 text-sm text-slate-500">
          Nhập địa chỉ email tài khoản của bạn để nhận hướng dẫn khôi phục mật khẩu.
        </p>
      </div>

      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        Địa chỉ Email
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@gmail.com"
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 font-normal normal-case"
        />
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="h-12 w-full rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60 text-sm cursor-pointer"
      >
        {isLoading ? "Đang gửi yêu cầu..." : "Gửi Hướng Dẫn Đặt Lại"}
      </button>

      {error && (
        <p role="alert" className="text-center text-sm text-rose-600">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-center text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
          {message}
        </p>
      )}

      <p className="text-center text-sm">
        <Link
          href="/auth/login"
          className="font-bold text-blue-600 hover:underline"
        >
          ← Quay lại trang Đăng nhập
        </Link>
      </p>
    </form>
  );
}
