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
    <div className="space-y-6">
      {/* Header & Back link */}
      <div>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition mb-3"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Quay lại Đăng nhập
        </Link>

        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Bảo Mật Tài Khoản Trung Tâm
          </p>
        </div>

        <h1 className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Thiết lập mật khẩu mới
        </h1>

        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Mật khẩu mới của bạn phải có độ dài tối thiểu 8 ký tự để đảm bảo an toàn cho tài khoản.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Mật khẩu mới
          </label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
            placeholder="Tối thiểu 8 ký tự"
            className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 px-4 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Xác nhận lại mật khẩu
          </label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (error) setError("");
            }}
            placeholder="Nhập lại mật khẩu mới"
            className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 px-4 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
          />
        </div>

        {!token && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs sm:text-sm text-rose-700 dark:text-rose-300 animate-fadeIn"
          >
            <span>{invalidLinkMessage}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs sm:text-sm text-rose-700 dark:text-rose-300 animate-fadeIn"
          >
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-center gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/80 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 animate-fadeIn"
          >
            <svg
              className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold">{message}</p>
              <Link
                href="/auth/login"
                className="mt-1 inline-block font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Đăng nhập ngay với mật khẩu mới →
              </Link>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !token}
          className="h-11 sm:h-12 w-full rounded-xl bg-slate-900 dark:bg-blue-600 font-bold text-white shadow-sm transition hover:bg-slate-800 dark:hover:bg-blue-500 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer text-xs sm:text-sm"
        >
          {isLoading ? "Đang xử lý..." : "Cập Nhật Mật Khẩu"}
        </button>

        <p className="pt-2 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <Link
            href="/auth/login"
            className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Quay lại trang Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  );
}
