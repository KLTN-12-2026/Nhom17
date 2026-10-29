"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/logout-button";

interface UserProfile {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "admin" | "instructor" | "student";
}

interface RoleDashboardShellProps {
  user: UserProfile;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.ReactNode;
  badge?: string;
}

const roleConfigs = {
  admin: {
    menuTitle: "MENU QUẢN TRỊ",
    title: "QUẢN TRỊ VIÊN",
    tagLabel: "Quản Trị Hệ Thống",
    roleSubtitle: "Bảng điều khiển & giám sát hạ tầng",
    badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-bold",
    gradientClass: "from-indigo-600 via-blue-600 to-violet-700",
    glowClass: "from-indigo-500/15 via-blue-500/10 to-violet-500/5",
    accentBg: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold",
    sidebarWidget: {
      title: "Hạ Tầng Dữ Liệu & AI",
      metric: "Uptime 99.98%",
      desc: "Hệ thống 11 Collections MongoDB và API Gemini vận hành ổn định liên tục.",
      badge: "Hoạt động tốt",
    },
  },
  instructor: {
    menuTitle: "DANH MỤC GIẢNG DẠY",
    title: "GIÁO VIÊN",
    tagLabel: "Giáo Viên Cấp 3",
    roleSubtitle: "Khu vực biên soạn đề thi & quản lý phòng thi",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold",
    gradientClass: "from-blue-600 via-indigo-600 to-blue-700",
    glowClass: "from-blue-500/10 to-indigo-500/5",
    accentBg: "bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold",
    sidebarWidget: {
      title: "Trợ Lý Soạn Đề AI",
      metric: "Gemini 1.5",
      desc: "Hỗ trợ trích xuất câu hỏi chuẩn ma trận Bộ GD&ĐT từ tài liệu và giáo án.",
      badge: "Sẵn sàng hỗ trợ",
    },
  },
  student: {
    menuTitle: "GÓC HỌC TẬP THPT",
    title: "HỌC SINH",
    tagLabel: "Học Sinh Cấp 3",
    roleSubtitle: "Không gian luyện thi & bứt phá điểm số",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold",
    gradientClass: "from-emerald-600 via-teal-600 to-emerald-700",
    glowClass: "from-emerald-500/10 to-teal-500/5",
    accentBg: "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-bold",
    sidebarWidget: {
      title: "Mục Tiêu Điểm 8.5+",
      metric: "Kỳ thi 2026",
      desc: "Trợ lý AI đồng hành phân tích câu sai và giải đáp phương pháp làm bài 24/7.",
      badge: "Lộ trình ôn tập",
    },
  },
};

const defaultNavItems: Record<"admin" | "instructor" | "student", NavItem[]> = {
  admin: [
    {
      label: "Tổng Quan Hạ Tầng",
      href: "/admin",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: "Quản Trị Người Dùng",
      href: "/admin/users",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: "Quản Lý Đơn Hàng & Doanh Thu",
      href: "/admin/orders",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: "Nhật Ký & Kiểm Toán",
      href: "/admin/logs",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ],
  instructor: [
    {
      label: "Tổng Quan Giảng Dạy",
      href: "/instructor",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      label: "Ngân Hàng Câu Hỏi & AI",
      href: "/instructor/questions",
      badge: "Gemini",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Soạn Đề Thi Trắc Nghiệm",
      href: "/instructor/exams",
      badge: "Snapshot",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      label: "Phòng Thi Trực Tuyến Live",
      href: "/instructor/rooms",
      badge: "Socket.IO",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Báo Cáo & Phổ Điểm",
      href: "/instructor/analytics",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: "Lộ Trình Môn Học",
      href: "/instructor/roadmaps",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
  ],
  student: [
    {
      label: "Góc Học Tập & Điểm Số",
      href: "/student",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      label: "Vào Phòng Thi Live (PIN)",
      href: "/student/join-room",
      badge: "Mã PIN",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Luyện Đề Trắc Nghiệm",
      href: "/student/practice",
      badge: "Luyện đề",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: "Lịch Sử Thi & Điểm Số",
      href: "/student/history",
      badge: "Mới",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Lộ Trình Bứt Phá Điểm Số",
      href: "/student/roadmaps",
      badge: "Mục tiêu",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: "AI Phân Tích Lỗ Hổng",
      href: "/student/ai-analysis",
      badge: "Gemini",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ],
};

export default function RoleDashboardShell({
  user,
  title,
  subtitle,
  actions,
  children,
}: RoleDashboardShellProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const roleConfig = roleConfigs[user.role] || roleConfigs.student;
  const navItems = defaultNavItems[user.role] || defaultNavItems.student;

  const initials = user.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase()
    : "AI";

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative selection:bg-blue-500/20 selection:text-blue-600 font-sans">
      {/* Hiệu ứng ánh sáng nền mềm mại theo vai trò */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-35 bg-gradient-to-br ${roleConfig.glowClass}`}
        />
        <div
          className={`absolute top-1/2 -left-40 w-96 h-96 rounded-full blur-3xl opacity-25 bg-gradient-to-tr ${roleConfig.glowClass}`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Top Header Bar với hiệu ứng kính mờ (Glassmorphism) */}
      <header className="sticky top-0 z-40 w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="h-[2px] w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Nút mở Menu trên Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Mở danh mục"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo Thương hiệu & Phân hệ */}
            <Link href="/" className="flex items-center gap-3 group">
              <div
                className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${roleConfig.gradientClass} flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200`}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black tracking-tight text-base sm:text-lg block leading-none text-slate-900 dark:text-white">
                    AI-
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                      Quizz
                    </span>
                  </span>
                  <span className={`hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide border ${roleConfig.badgeClass}`}>
                    {roleConfig.tagLabel}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-1">
                  {roleConfig.roleSubtitle}
                </span>
              </div>
            </Link>
          </div>

          {/* VÙNG TIỆN ÍCH TRUNG TÂM THEO VAI TRÒ */}
          {user.role === "admin" && (
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-500 w-64">
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="flex-1 truncate text-xs font-normal text-slate-400">Tìm kiếm nhanh tài khoản, đề...</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-400 shadow-2xs">
                  ⌘K
                </kbd>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Hạ tầng trực tuyến (99.9%)</span>
              </div>
            </div>
          )}

          {user.role === "student" && (
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/student/join-room"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition shadow-2xs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Vào Phòng Thi Live (PIN)</span>
              </Link>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>🎯 Mục tiêu:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">Tốt nghiệp THPT 2026</span>
              </div>
            </div>
          )}

          {user.role === "instructor" && (
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/instructor/questions"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>Soạn Câu Hỏi Mới</span>
              </Link>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>📚 Khảo thí:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Chuẩn ma trận Bộ GD&amp;ĐT</span>
              </div>
            </div>
          )}

          {/* User profile & Action Area */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Nút về trang chủ */}
            <Link
              href="/"
              title="Về trang chủ"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>

            {/* Thông tin người dùng (Bấm vào xem Profile) */}
            <Link
              href="/profile"
              title="Xem hồ sơ cá nhân"
              className="flex items-center gap-2.5 pl-2 sm:border-l border-slate-200 dark:border-slate-800 group hover:opacity-90 transition"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-blue-500/20 ring-2 ring-white dark:ring-slate-800 shrink-0 group-hover:scale-105 transition-transform">
                {initials}
              </div>

              <div className="hidden xl:flex flex-col text-left leading-tight">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[130px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  {user.name || "Người dùng"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                  {user.email}
                </span>
              </div>
            </Link>

            {/* Nút Đăng xuất có modal xác nhận */}
            <LogoutButton
              variant="ghost"
              size="sm"
              label="Đăng xuất"
              className="text-xs font-semibold transition rounded-xl px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            />
          </div>
        </div>
      </header>

      {/* Khung chính: Sidebar bên trái + Vùng nội dung */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex gap-8 relative z-10">
        {/* Desktop Sidebar thân thiện */}
        <aside className="hidden lg:block w-68 shrink-0">
          <div className="sticky top-24 space-y-4">
            {/* Hộp danh mục điều hướng */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-3.5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 px-3 flex items-center justify-between">
                <span>{roleConfig.menuTitle}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-all duration-150 relative ${isActive
                          ? `${roleConfig.accentBg}`
                          : "font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:translate-x-0.5"
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`p-1.5 rounded-xl transition-colors ${isActive
                              ? "bg-white/20 dark:bg-slate-900/40 text-current"
                              : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                            }`}
                        >
                          {item.icon({ className: "w-4 h-4 shrink-0 transition-transform group-hover:scale-105" })}
                        </span>
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Lối tắt Hồ Sơ Cá Nhân (Chuẩn User Story 5) */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <Link
                  href="/profile"
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.name || "Tài khoản"}</div>
                      <div className="text-[10px] text-slate-400">Hồ sơ cá nhân</div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition">➔</span>
                </Link>
              </div>
            </div>

            {/* Widget thân thiện theo từng đối tượng học sinh / giáo viên */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-4 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200">
                    {roleConfig.sidebarWidget.title}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60">
                  {roleConfig.sidebarWidget.metric}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {roleConfig.sidebarWidget.desc}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Trạng thái</span>
                <span className="text-emerald-400 font-semibold">{roleConfig.sidebarWidget.badge}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer (Vuốt từ cạnh ra) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex animate-fade-in">
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-900 p-6 flex flex-col justify-between shadow-2xl z-10 border-r border-slate-200 dark:border-slate-800">
              <div className="space-y-6">
                {/* Header Mobile Drawer */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${roleConfig.gradientClass} flex items-center justify-center text-white font-bold text-xs`}>
                      AI
                    </div>
                    <div>
                      <span className="font-bold text-sm block leading-none">AI-Quizz</span>
                      <span className="text-xs text-slate-500 font-medium">{roleConfig.tagLabel}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Danh mục menu trên Mobile */}
                <nav className="space-y-1.5">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm transition ${isActive
                            ? `${roleConfig.accentBg}`
                            : "font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon({ className: "w-4 h-4" })}
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-medium">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Thông tin tài khoản ở chân Drawer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 mb-3 hover:opacity-80 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">{user.name || "Người dùng"}</div>
                    <div className="text-xs text-slate-500 truncate">Xem hồ sơ cá nhân</div>
                  </div>
                </Link>
                <LogoutButton className="w-full text-center py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 hover:bg-rose-100 cursor-pointer" />
              </div>
            </div>
          </div>
        )}

        {/* Vùng nội dung chính của trang con */}
        <main className="flex-1 min-w-0">
          {/* Header Banner thân thiện */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${roleConfig.badgeClass}`}>
                  {roleConfig.tagLabel}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{roleConfig.roleSubtitle}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                {subtitle}
              </p>
            </div>

            {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
          </div>

          {/* Ruột trang con */}
          <div className="animate-fade-in pb-12">{children}</div>
        </main>
      </div>

      {/* Footer nội bộ thân thiện */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl py-5 text-xs text-slate-500 dark:text-slate-400 relative z-10 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              © 2026 <strong className="text-slate-700 dark:text-slate-300">AI-Quizz</strong> • Trung tâm luyện thi trắc nghiệm Cấp 3 &amp; ĐGNL
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs font-medium">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              Trang chủ
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link href="/#ai-features" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              Tính năng AI
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[11px] text-slate-400">Hỗ trợ học tập 24/7</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
