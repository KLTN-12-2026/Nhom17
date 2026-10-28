//src\components\auth\auth-shell.tsx
import React from "react";
import Link from "next/link";

type AuthShellProps = {
  children: React.ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-slate-50 dark:bg-slate-950 lg:grid-cols-12 selection:bg-blue-500/30 selection:text-blue-600 font-sans">
      {/* Left showcase (5 cols on lg, 6 cols on xl) */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-10 xl:px-14 py-10 text-white lg:flex lg:flex-col lg:col-span-5 xl:col-span-5 border-r border-slate-800/80 shadow-2xl">
        {/* Decorative background glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Top Header & Branding */}
        <div className="relative flex items-center justify-between z-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-2 ring-white/20 group-hover:scale-105 transition-all">
                <svg
                  className="w-5 h-5"
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
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-slate-900" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-white leading-none">
                  Trắc Nghiệm{" "}
                  <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                    AI
                  </span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                  DTU
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-1">
                KLTN • Nhóm 17 (12-2026)
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <span>←</span>
            <span>Trang chủ</span>
          </Link>
        </div>

        {/* Main Showcase Content */}
        <div className="relative my-auto py-10 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Nền Tảng Đánh Giá Năng Lực AI
          </div>

          <h1 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight text-white mb-4">
            Đánh giá năng lực chuẩn xác với{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
              Trí Tuệ Nhân Tạo
            </span>
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed font-medium mb-8">
            Hệ sinh thái thi trắc nghiệm trực tuyến thông minh dành cho Giảng viên &amp;
            Học viên Trường Đại học Duy Tân.
          </p>

          {/* 3 Feature cards */}
          <div className="space-y-3">
            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              title="Sinh Câu Hỏi AI Tự Động"
              description="Google Gemini 1.5 tự động phân tích giáo trình để tạo bộ đề trắc nghiệm đa cấp độ."
            />

            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
              title="Giám Sát Live & Chống Gian Lận"
              description="Theo dõi phòng thi thời gian thực, cảnh báo đổi tab và phân tích hành vi thi cử."
            />

            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title="Lộ Trình Ôn Tập Cá Nhân Hóa"
              description="AI chẩn đoán lỗ hổng kiến thức sau mỗi bài thi để đề xuất kế hoạch ôn tập riêng biệt."
            />
          </div>
        </div>

        {/* Showcase Footer */}
        <div className="relative mt-auto pt-6 border-t border-slate-800/80 z-10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hệ thống Khảo thí Trực tuyến Sẵn sàng</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Khoa CNTT — DTU</span>
        </div>
      </section>

      {/* Right Auth Content (7 cols on lg, 7 cols on xl) */}
      <section className="flex min-h-screen items-center justify-center px-4 sm:px-8 py-12 lg:col-span-7 xl:col-span-7 relative">
        {/* Subtle background glow for right side */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[480px] relative z-10">{children}</div>
      </section>
    </main>
  );
}

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:border-white/20">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/10 shadow-inner">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white tracking-wide">{title}</p>
        <p className="mt-1 text-xs text-slate-300/80 leading-relaxed font-normal">
          {description}
        </p>
      </div>
    </div>
  );
}
