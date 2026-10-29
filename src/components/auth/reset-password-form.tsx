//src\components\auth\reset-password-form.tsx
"use client";

import { resetPasswordSchema } from "@/lib/validations/auth";
import Link from "next/link";
import { useState } from "react";

const invalidLinkMessage = "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn sử dụng.";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const result = resetPasswordSchema.safeParse({
      token,
      password,
      confirmPassword,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Thông tin mật khẩu chưa hợp lệ");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? invalidLinkMessage);
        return;
      }

      setMessage(data.message ?? "Cập nhật mật khẩu mới thành công!");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          Thiết Lập Mật Khẩu Mới
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Mật khẩu mới của bạn phải có độ dài tối thiểu 8 ký tự.
        </p>
      </div>

      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        Mật khẩu mới
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Nhập mật khẩu mới"
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 font-normal normal-case"
        />
      </label>

      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        Xác nhận lại mật khẩu
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Nhập lại mật khẩu mới"
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 font-normal normal-case"
        />
      </label>

      {!token && (
        <p role="alert" className="text-sm text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
          {invalidLinkMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!token || isLoading}
        className="h-12 w-full rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60 text-sm cursor-pointer"
      >
        {isLoading ? "Đang cập nhật..." : "Cập Nhật Mật Khẩu"}
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
          ← Đăng nhập ngay với mật khẩu mới
        </Link>
      </p>
    </form>
  );
}
