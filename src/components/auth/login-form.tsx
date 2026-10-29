//src\components\auth\login-form.tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isRegistered = searchParams.get("registered") === "true";
  const successNotice = isRegistered
    ? "Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục."
    : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Tài khoản hoặc mật khẩu không chính xác, vui lòng thử lại.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleLogin() {
    setIsGoogleLoading(true);
    signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="space-y-6">
      {/* Header & Back link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition mb-4"
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
          Về trang chủ
        </Link>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
          Chào mừng trở lại
        </p>

        <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Đăng nhập tài khoản
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Đăng nhập để vào không gian luyện thi và làm bài trắc nghiệm AI thông minh.
        </p>
      </div>

      {/* Success banner after registration */}
      {successNotice && (
        <div
          className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 animate-fadeIn"
          role="status"
        >
          <svg
            className="w-5 h-5 shrink-0 text-emerald-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>{successNotice}</span>
        </div>
      )}

      {/* Google Login Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading || isLoading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer text-sm"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>
          {isGoogleLoading ? "Đang kết nối Google..." : "Tiếp tục với Google"}
        </span>
      </button>

      {/* Divider */}
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#f8f7f3] dark:bg-slate-900 px-3 font-semibold tracking-wider text-slate-400">
            Hoặc đăng nhập bằng Email
          </span>
        </div>
      </div>

      {/* Email / Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Địa chỉ Email
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            placeholder="hocvien@gmail.com"
            required
            className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Mật khẩu
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Nhập mật khẩu của bạn"
              required
              className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 pr-16 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-blue-600 transition cursor-pointer"
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 animate-fadeIn"
            role="alert"
          >
            <svg
              className="w-4 h-4 shrink-0 text-rose-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="h-12 w-full rounded-xl bg-blue-600 font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer text-sm"
        >
          {isLoading ? "Đang đăng nhập..." : "Đăng Nhập Vào Hệ Thống"}
        </button>

        <p className="pt-2 text-center text-sm text-slate-500">
          Chưa có tài khoản?{" "}
          <Link
            href="/auth/register"
            className="font-bold text-blue-600 hover:underline"
          >
            Đăng ký tài khoản mới
          </Link>
        </p>
      </form>
    </div>
  );
}
