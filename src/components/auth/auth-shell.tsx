//src\components\auth\auth-shell.tsx
import React from "react";
import Link from "next/link";

type AuthShellProps = {
  children: React.ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-slate-50 dark:bg-slate-950 lg:grid-cols-12 selection:bg-blue-500/30 selection:text-blue-600 font-sans">
      {/* Left showcase (5 cols on lg, 5 cols on xl) */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-10 xl:px-14 py-10 text-white lg:flex lg:flex-col lg:col-span-5 xl:col-span-5 border-r border-slate-800/80 shadow-2xl">
        {/* Decorative background glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Top Header & Branding (Đồng bộ thương hiệu PQP AI-Quizz) */}
        <div className="relative flex items-center justify-between z-10">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Standard PQP Brand Badge */}
            <div className="min-w-9 h-9 px-2 rounded-xl bg-white text-slate-900 flex items-center justify-center font-bold text-xs tracking-tight shadow-md ring-2 ring-white/20 group-hover:scale-105 transition-transform shrink-0">
              PQP
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white leading-none">
                  AI-Quizz
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">
                Trung Tâm Luyện Thi &amp; Khảo Thí
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <span>←</span>
            <span>Trang chủ</span>
          </Link>
        </div>

        {/* Main Showcase Content */}
        <div className="relative my-auto py-8 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-[11px] font-semibold tracking-wide mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Hệ Thống Khảo Thí &amp; Đào Tạo Trực Tuyến
          </div>

          <h1 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight text-white mb-4">
            Khảo thí &amp; Luyện thi thông minh với{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
              Trí Tuệ Nhân Tạo
            </span>
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed font-normal mb-8">
            Nền tảng số hóa ngân hàng đề thi, điều phối phòng thi trực tuyến và chẩn đoán năng lực học viên dành riêng cho Trung tâm luyện thi.
          </p>

          {/* 3 Feature cards chuẩn cho Trung tâm luyện thi */}
          <div className="space-y-3.5">
            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              title="Ngân Hàng Đề Thi &amp; Soạn Đề AI"
              description="Trợ lý Gemini AI hỗ trợ biên soạn câu hỏi đa dạng mức độ từ tài liệu bài giảng và ngân hàng kiến thức trung tâm."
            />

            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
              title="Phòng Thi Trực Tuyến &amp; Giám Sát Live"
              description="Tổ chức các kỳ thi thử, kiểm tra định kỳ có giám sát chống gian lận, tự động chấm điểm và tổng hợp phổ điểm."
            />

            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title="Chẩn Đoán Năng Lực &amp; Lộ Trình Cá Nhân Hóa"
              description="AI phân tích điểm nghẽn kiến thức sau mỗi bài kiểm tra, giúp học viên khắc phục lỗ hổng và tối ưu hóa kết quả thi."
            />
          </div>
        </div>

        {/* Showcase Footer */}
        <div className="relative mt-auto pt-6 border-t border-slate-800/80 z-10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hệ thống Trung tâm sẵn sàng vận hành</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Powered by Gemini AI</span>
        </div>
      </section>

      {/* Right Auth Content (7 cols on lg, 7 cols on xl) */}
      <section className="flex min-h-screen items-center justify-center px-4 sm:px-8 py-10 lg:col-span-7 xl:col-span-7 relative bg-slate-50 dark:bg-slate-950">
        {/* Subtle background glow for right side */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Container */}
        <div className="w-full max-w-[500px] relative z-10 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          {children}
        </div>
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
    <div className="group flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:border-white/20">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10 shadow-inner">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white tracking-wide">{title}</p>
        <p className="mt-1 text-xs text-slate-300 leading-relaxed font-normal">
          {description}
        </p>
      </div>
    </div>
  );
}
