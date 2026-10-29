"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";

type LogoutButtonProps = {
  /** Giao diện nút: "solid" | "ghost" | "link" */
  variant?: "solid" | "ghost" | "link";
  /** Kích thước: "sm" | "md" */
  size?: "sm" | "md";
  /** Text hiển thị */
  label?: string;
  /** Trang sẽ redirect sau khi đăng xuất */
  callbackUrl?: string;
  /** Class bổ sung */
  className?: string;
};

const variantStyles: Record<NonNullable<LogoutButtonProps["variant"]>, string> = {
  solid: "bg-blue-600 text-white hover:bg-blue-700 border border-transparent shadow-xs",
  ghost: "bg-transparent text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-700",
  link: "bg-transparent text-blue-600 dark:text-blue-400 hover:underline border-0 px-0 py-0",
};

const sizeStyles: Record<NonNullable<LogoutButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export default function LogoutButton({
  variant = "solid",
  size = "md",
  label = "Đăng xuất",
  callbackUrl = "/auth/login",
  className = "",
}: LogoutButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lắng nghe phím ESC để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showConfirm && !isLoggingOut) {
        setShowConfirm(false);
      }
    };
    if (showConfirm) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConfirm, isLoggingOut]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl });
  };

  const modalContent = showConfirm && mounted ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in font-sans">
      <div
        className="fixed inset-0"
        onClick={() => !isLoggingOut && setShowConfirm(false)}
      />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200/90 dark:border-slate-800 z-10 text-center animate-scale-up">
        {/* Icon cảnh báo */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200/60 dark:border-rose-900/60 shadow-sm">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          Xác Nhận Đăng Xuất
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
          Bạn có chắc chắn muốn kết thúc phiên làm việc và đăng xuất khỏi hệ thống <strong className="text-slate-700 dark:text-slate-300">AI-Quizz</strong> không?
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 sm:py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/25 transition cursor-pointer disabled:opacity-60"
          >
            {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className={[
          "inline-flex items-center gap-1.5 rounded-xl font-semibold transition-all duration-150 cursor-pointer",
          variantStyles[variant],
          variant !== "link" ? sizeStyles[size] : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        title="Đăng xuất khỏi hệ thống"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span>{label}</span>
      </button>

      {/* Render modal trực tiếp vào document.body bằng React Portal */}
      {modalContent && typeof document !== "undefined" ? createPortal(modalContent, document.body) : null}
    </>
  );
}
