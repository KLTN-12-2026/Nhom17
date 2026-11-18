//src\components\auth\register-form.tsx
"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [teacherSecretCode, setTeacherSecretCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (password.length < 8) {
      setMessage("Mật khẩu phải có tối thiểu 8 ký tự để đảm bảo an toàn.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp với mật khẩu đã nhập.");
      return;
    }

    if (role === "instructor" && !teacherSecretCode.trim()) {
      setMessage("Vui lòng nhập Mã xác thực Giảng viên do ban quản trị trung tâm cấp.");
      return;
    }

    setIsLoading(true);

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      teacherSecretCode:
        role === "instructor" ? teacherSecretCode.trim() : undefined,
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage("Đăng ký tài khoản thành công! Đang chuyển hướng đến đăng nhập...");
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setTeacherSecretCode("");

        setTimeout(() => {
          router.push("/auth/login?registered=true");
        }, 1200);
      } else {
        setMessage(data.message || "Đăng ký không thành công. Vui lòng thử lại.");
        setIsSuccess(false);
      }
    } catch {
      setMessage("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.");
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleRegister() {
    setIsGoogleLoading(true);
    signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="space-y-6">
      {/* Header & Back link */}
      <div>
        <Link
          href="/"
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
          Về trang chủ
        </Link>

        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Gia Nhập Trung Tâm Luyện Thi
          </p>
        </div>

        <h2 className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Đăng ký tài khoản mới
        </h2>

        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Tạo tài khoản để tham gia các khóa luyện thi trắc nghiệm và trải nghiệm trợ lý AI tại trung tâm.
        </p>
      </div>

      {/* Google Quick Sign Up */}
      <button
        type="button"
        onClick={handleGoogleRegister}
        disabled={isGoogleLoading || isLoading}
        className="flex h-11 sm:h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer text-xs sm:text-sm"
      >
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
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
          {isGoogleLoading
            ? "Đang kết nối Google..."
            : "Đăng ký nhanh với Google (Dành cho Học viên)"}
        </span>
      </button>

      {/* Divider */}
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-slate-900 px-3 font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px]">
            Hoặc đăng ký bằng Email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role selection - Chuẩn Trung tâm luyện thi */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Chọn vai trò tại trung tâm
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`rounded-xl border p-3.5 text-left transition cursor-pointer ${
                role === "student"
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20"
                  : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Học viên Trung tâm
                </span>
                {role === "student" && (
                  <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                )}
              </div>
              <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Luyện đề thi, kiểm tra định kỳ &amp; nhận trợ lý AI
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRole("instructor")}
              className={`rounded-xl border p-3.5 text-left transition cursor-pointer ${
                role === "instructor"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-500/20"
                  : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Giảng viên / Giáo viên
                </span>
                {role === "instructor" && (
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                )}
              </div>
              <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Biên soạn đề thi, mở phòng thi &amp; theo dõi phổ điểm
              </span>
            </button>
          </div>

          {/* Instructor Secret Verification Key (Only when Instructor is selected) */}
          {role === "instructor" && (
            <div className="mt-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 p-3.5 transition-all">
              <div className="flex items-center gap-2 mb-1.5">
                <svg
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                  Mã Xác Thực Giảng Viên
                </label>
              </div>
              <input
                type="text"
                value={teacherSecretCode}
                onChange={(e) => {
                  setTeacherSecretCode(e.target.value);
                  if (message) setMessage("");
                }}
                placeholder="Ví dụ: INSTRUCTOR-KEY-2026"
                required={role === "instructor"}
                className="h-10 sm:h-11 w-full rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 px-3.5 text-xs sm:text-sm font-mono font-bold tracking-wider text-slate-800 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 uppercase"
              />
              <p className="mt-1.5 text-[11px] text-blue-700/80 dark:text-blue-400 leading-relaxed">
                Lưu ý bảo mật: Nhập mã xác minh do ban quản trị trung tâm cấp để kích hoạt quyền Giảng viên.
              </p>
            </div>
          )}
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Họ và tên
          </label>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (message) setMessage("");
            }}
            placeholder="Nguyễn Văn A"
            required
            className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 px-4 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
          />
        </div>

        {/* Email */}
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
              if (message) setMessage("");
            }}
            placeholder="hocvien@gmail.com"
            required
            className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 px-4 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (message) setMessage("");
              }}
              placeholder="Tối thiểu 8 ký tự"
              required
              minLength={8}
              className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 px-4 pr-16 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
          <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">
            Mật khẩu phải chứa ít nhất 8 ký tự để đảm bảo an toàn.
          </span>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Xác nhận lại mật khẩu
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (message) setMessage("");
              }}
              placeholder="Nhập lại mật khẩu vừa nhập"
              required
              minLength={8}
              className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 px-4 pr-16 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
            >
              {showConfirmPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
        </div>

        {/* Status message */}
        {message && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs sm:text-sm animate-fadeIn ${
              isSuccess
                ? "border-emerald-200 dark:border-emerald-900/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                : "border-rose-200 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
            }`}
            role="alert"
          >
            {isSuccess ? (
              <svg
                className="w-4.5 h-4.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-4.5 h-4.5 shrink-0 text-rose-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span>{message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="h-11 sm:h-12 w-full rounded-xl bg-slate-900 dark:bg-blue-600 font-bold text-white shadow-sm transition hover:bg-slate-800 dark:hover:bg-blue-500 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer text-xs sm:text-sm"
        >
          {isLoading
            ? "Đang tạo tài khoản..."
            : `Đăng Ký Tài Khoản ${role === "student" ? "Học Viên" : "Giảng Viên"}`}
        </button>

        <p className="pt-2 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Đã có tài khoản?{" "}
          <Link
            href="/auth/login"
            className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </form>
    </div>
  );
}
