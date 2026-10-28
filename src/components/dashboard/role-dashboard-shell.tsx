"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/logout-button";

export interface NavItem {
  label: string;
  href: string;
  badge?: string;
  icon: (props: { className?: string }) => React.ReactNode;
}

interface RoleDashboardShellProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: "admin" | "instructor" | "student";
  };
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const roleConfigs = {
  admin: {
    title: "QUẢN TRỊ VIÊN",
    roleNameEn: "Admin Console",
    badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-bold",
    gradientClass: "from-indigo-600 via-blue-600 to-violet-700",
    glowClass: "from-indigo-500/15 via-blue-500/10 to-violet-500/5",
    accentBg: "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md shadow-slate-900/10 font-bold",
    indicatorColor: "bg-indigo-600",
    iconColor: "text-indigo-600",
    subtleBorder: "border-indigo-200/80 dark:border-indigo-800/80",
  },
  instructor: {
    title: "GIẢNG VIÊN",
    roleNameEn: "Instructor Hub",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold",
    gradientClass: "from-blue-600 via-indigo-600 to-blue-700",
    glowClass: "from-blue-500/10 to-indigo-500/5",
    accentBg: "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold",
    indicatorColor: "bg-blue-600",
    iconColor: "text-blue-600",
    subtleBorder: "border-blue-200/80 dark:border-blue-800/80",
  },
  student: {
    title: "HỌC VIÊN",
    roleNameEn: "Student Station",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold",
    gradientClass: "from-emerald-600 via-teal-600 to-emerald-700",
    glowClass: "from-emerald-500/10 to-teal-500/5",
    accentBg: "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold",
    indicatorColor: "bg-emerald-600",
    iconColor: "text-emerald-600",
    subtleBorder: "border-emerald-200/80 dark:border-emerald-800/80",
  },
};

const defaultNavItems: Record<"admin" | "instructor" | "student", NavItem[]> = {
  admin: [
    {
      label: "Tổng Quan Quản Trị",
      href: "/admin",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: "Quản Lý Tài Khoản",
      href: "/admin/users",
      badge: "Tài khoản",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: "Cây Môn Học & Chủ Đề",
      href: "/admin/subjects",
      badge: "Topic Tree",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: "Sổ Cái & Giao Dịch",
      href: "/admin/orders",
      badge: "Finance",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Cấu Hình An Ninh & AI",
      href: "/admin/settings",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
      label: "Lộ Trình Khóa Học",
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
      label: "Bàn Học & Tổng Quan",
      href: "/student",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      label: "Vào Phòng Thi Live",
      href: "/student/join-room",
      badge: "Live PIN",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Luyện Thi Trắc Nghiệm",
      href: "/student/practice",
      badge: "Quiz",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: "Lộ Trình Của Tôi",
      href: "/student/roadmaps",
      badge: "Progress",
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: "Đánh Giá Năng Lực AI",
      href: "/student/ai-analysis",
      badge: "AI Feedback",
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
    : "US";

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative selection:bg-rose-500/20 selection:text-rose-600">
      {/* Ambient Radial Background Glow Tailored by Role */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-40 bg-gradient-to-br ${roleConfig.glowClass}`}
        />
        <div
          className={`absolute top-1/2 -left-40 w-96 h-96 rounded-full blur-3xl opacity-30 bg-gradient-to-tr ${roleConfig.glowClass}`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Top Navigation Bar with Glassmorphism */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="h-[2px] w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-17 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo & App title with Glowing Effect */}
            <Link href="/" className="flex items-center gap-3 group">
              <div
                className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${roleConfig.gradientClass} flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200`}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-base sm:text-lg block leading-none text-slate-900 dark:text-white">
                    Trắc Nghiệm{" "}
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                      AI
                    </span>
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold tracking-wide border border-indigo-200/50 dark:border-indigo-800/50">
                    DTU • {roleConfig.title}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium block mt-1">
                  Bàn làm việc {roleConfig.roleNameEn}
                </span>
              </div>
            </Link>
          </div>

          {/* Quick Search Command Bar & System Status (Desktop) */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-500 w-64 hover:border-indigo-400/60 transition-colors">
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
              <span>Hệ thống trực tuyến (99.9%)</span>
            </div>
          </div>

          {/* User profile & Role Badge */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase border shadow-2xs ${roleConfig.badgeClass}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {roleConfig.title}
            </div>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-2.5 pl-2 sm:border-l border-slate-200 dark:border-slate-800">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-500/20 ring-2 ring-white dark:ring-slate-800 shrink-0">
                {initials}
              </div>

              <div className="hidden xl:flex flex-col text-left leading-tight">
                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[130px]">
                  {user.name || "Người dùng"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                  {user.email}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <LogoutButton
              variant="ghost"
              size="sm"
              label="Đăng xuất"
              className="text-xs font-semibold transition rounded-xl px-3 py-1.5"
            />
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex gap-8 relative z-10">
        {/* Desktop Sidebar with Glass Card Design */}
        <aside className="hidden lg:block w-68 shrink-0">
          <div className="sticky top-24 space-y-4">
            {/* Nav Menu Box */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-3.5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 px-3 flex items-center justify-between">
                <span>Menu Quản Trị</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-150 relative ${
                        isActive
                          ? `${roleConfig.accentBg} font-semibold`
                          : "font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:translate-x-0.5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`p-1.5 rounded-lg transition-colors ${
                            isActive
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
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            isActive
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
            </div>

            {/* Cloud & AI Infrastructure Status Card */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 rounded-3xl p-4 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-indigo-300">
                    MongoDB Atlas • AI Ready
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-semibold">18ms</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Hệ thống 11 Collections NoSQL và AI Gemini 1.5 Pro vận hành tự động liên tục.
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>SLA Uptime</span>
                <span className="text-emerald-400 font-semibold">99.98% Healthy</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer Slide-over */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex animate-fade-in">
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-900 p-6 flex flex-col justify-between shadow-2xl z-10 border-r border-slate-200 dark:border-slate-800">
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${roleConfig.gradientClass} flex items-center justify-center text-white font-bold text-xs`}>
                      AI
                    </div>
                    <div>
                      <span className="font-semibold text-sm block leading-none">EduAI Enterprise</span>
                      <span className="text-xs text-slate-500 uppercase font-medium">{roleConfig.title}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Drawer Nav Items */}
                <nav className="space-y-1.5">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm transition ${
                          isActive
                            ? `${roleConfig.accentBg} font-semibold`
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

              {/* Drawer Footer User Card */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold truncate max-w-[130px]">{user.name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[130px]">{user.email}</div>
                    </div>
                  </div>
                </div>
                <LogoutButton className="w-full text-center py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 hover:bg-rose-100" />
              </div>
            </div>
          </div>
        )}

        {/* Primary Page Content */}
        <main className="flex-1 min-w-0">
          {/* Header Banner */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  {roleConfig.roleNameEn}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-medium text-slate-500">EduAI Cloud Infrastructure</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                {subtitle}
              </p>
            </div>

            {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
          </div>

          {/* Children View */}
          <div className="animate-fade-in pb-12">{children}</div>
        </main>

      </div>


      {/* Dashboard Unified Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl py-6 text-xs text-slate-500 dark:text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              © 2026 <strong className="text-slate-700 dark:text-slate-300">Nhóm 17</strong> • Khóa Luận Tốt Nghiệp • Khoa CNTT — Trường Đại học Duy Tân (DTU)
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs font-medium">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              Trang chủ
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link href="/unauthorized" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              Bảo mật RBAC
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[11px] text-slate-400">Gemini 1.5 &amp; MongoDB Atlas</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
