"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { AuthenticatedUser } from "@/lib/auth-guards";

interface HeaderClientProps {
  user: AuthenticatedUser | null;
}

export default function HeaderClient({ user }: HeaderClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Phát hiện cuộn trang để tăng độ mờ nền (blur effect)
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const roleBadgeConfig = {
    admin: {
      label: "Quản trị viên",
      badgeClass:
        "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      dotClass: "bg-rose-500",
      dashboardUrl: "/admin",
    },
    instructor: {
      label: "Giảng viên",
      badgeClass:
        "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      dotClass: "bg-blue-500",
      dashboardUrl: "/instructor",
    },
    student: {
      label: "Học viên",
      badgeClass:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
      dashboardUrl: "/student",
    },
  };

  const currentRole = user ? roleBadgeConfig[user.role] : null;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-md shadow-slate-900/5"
          : "bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50"
      }`}
    >
      {/* Thanh viền gradient trang trí trên cùng */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">
        {/* LOGO & BRANDING */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="relative">
            {/* Hộp icon công nghệ phát sáng */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-2 ring-white/60 dark:ring-slate-800 group-hover:scale-105 group-hover:shadow-blue-500/40 transition-all duration-300">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            {/* Điểm xanh báo trạng thái trực tuyến */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-tight text-lg sm:text-xl text-slate-900 dark:text-white leading-none">
                AI-
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Quizz
                </span>
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mt-1">
              Nền tảng thi &amp; đánh giá thông minh
            </span>
          </div>
        </Link>

        {/* NAVIGATION DESKTOP */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          <Link
            href="/"
            className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all"
          >
            Trang Chủ
          </Link>
          <Link
            href="/#ai-features"
            className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all flex items-center gap-1.5"
          >
            <span>Tính Năng AI</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400">
              Gemini
            </span>
          </Link>
          <Link
            href="/#live-proctoring"
            className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all"
          >
            Giám Sát Live
          </Link>
          <Link
            href="/#student-experience"
            className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all"
          >
            Dành Cho Học Viên
          </Link>
          <Link
            href="/#practice-preview"
            className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all"
          >
            Đề Thi Mẫu
          </Link>
        </nav>

        {/* AUTH ACTION AREA */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {user ? (
            /* TRƯỜNG HỢP ĐÃ ĐĂNG NHẬP */
            <div className="flex items-center gap-3">
              {/* Thẻ hiển thị vai trò & thông tin tài khoản */}
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 dark:text-white max-w-[110px] truncate leading-tight">
                    {user.name || user.email}
                  </div>
                  {currentRole && (
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                      {currentRole.label}
                    </div>
                  )}
                </div>
              </div>

              {/* Nút vào Bàn làm việc / Dashboard */}
              <Link
                href={currentRole?.dashboardUrl || "/dashboard"}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all shadow-md shadow-blue-500/25"
              >
                <span>Bàn làm việc</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>

              {/* Nút đăng xuất nhanh */}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                title="Đăng xuất khỏi hệ thống"
                className="hidden sm:inline-flex p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          ) : (
            /* TRƯỜNG HỢP CHƯA ĐĂNG NHẬP */
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 rounded-xl transition-all"
              >
                Đăng nhập
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 active:scale-95 transition-all shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35"
              >
                <span>Bắt đầu ngay</span>
                <svg
                  className="w-4 h-4 hidden sm:inline-block"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>
          )}

          {/* NÚT TOGGLE MENU MOBILE */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Mở Menu Điều Hướng"
          >
            {mobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE FLYOUT MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl px-4 pt-4 pb-6 space-y-3 animate-fade-in shadow-2xl">
          {user && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {user.name || user.email}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    {currentRole?.label}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Đăng xuất
              </button>
            </div>
          )}

          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70"
            >
              <span>🏠</span>
              <span>Trang Chủ</span>
            </Link>
            <Link
              href="/#ai-features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70"
            >
              <div className="flex items-center gap-3">
                <span>⚡</span>
                <span>Tính Năng AI Tự Động</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                Gemini
              </span>
            </Link>
            <Link
              href="/#live-proctoring"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70"
            >
              <span>📹</span>
              <span>Giám Sát Gian Lận Live</span>
            </Link>
            <Link
              href="/#student-experience"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70"
            >
              <span>🎓</span>
              <span>Dành Cho Học Viên</span>
            </Link>
            <Link
              href="/#practice-preview"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70"
            >
              <span>📚</span>
              <span>Đề Thi Trắc Nghiệm Mẫu</span>
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            {user ? (
              <Link
                href={currentRole?.dashboardUrl || "/dashboard"}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md"
              >
                <span>Vào Bàn Làm Việc</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center font-bold text-sm text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
