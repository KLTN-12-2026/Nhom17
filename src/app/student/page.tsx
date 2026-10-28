import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import Link from "next/link";

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/student");
  }

  return (
    <RoleDashboardShell
      user={user}
      title="Bàn Học Trực Tuyến & Luyện Thi AI"
      subtitle="Theo dõi tiến độ học tập, tham gia phòng thi trực tuyến và nhận gợi ý thông minh từ AI"
    >
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Bài Thi Đã Nộp</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">24</div>
          <div className="mt-2 text-xs text-blue-600 font-semibold">
            Tỷ lệ đạt chuẩn: 91.6%
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Điểm Trung Bình</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">8.4 / 10</div>
          <div className="mt-2 text-xs text-blue-600 font-semibold">
            Xếp loại Giỏi toàn diện
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Lộ Trình Đang Học</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">2 Khóa Học</div>
          <div className="mt-2 text-xs text-purple-600 font-semibold">
            Tiến độ trung bình 65%
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cảnh Báo Lỗ Hổng AI</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">2 Chủ Đề</div>
          <div className="mt-2 text-xs text-amber-600 font-semibold">
            Cần ôn lại: Đạo hàm & Tích phân
          </div>
        </div>
      </div>

      {/* Main Student Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Join Live Room Prompt */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-lg">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white mb-4">
              <span className="w-2 h-2 rounded-full bg-sky-300 animate-ping" />
              Phòng Thi Thời Gian Thực
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">
              Nhập mã phòng thi từ giáo viên
            </h2>
            <p className="text-sm text-blue-100 mb-6 leading-relaxed">
              Bạn có mã phòng thi trực tuyến? Hãy nhập mã phòng (ví dụ: <code className="bg-white/20 px-2 py-0.5 rounded font-mono font-bold">THI-TOAN-101</code>) để bước vào phòng thi và kết nối giám sát webcam AI.
            </p>
            <form action="/student/join-room" method="GET" className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                name="room_code"
                placeholder="Nhập mã phòng (VD: THI-TOAN-101)"
                className="px-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 font-mono font-bold text-sm outline-none focus:ring-4 focus:ring-white/30 flex-1 uppercase"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 active:scale-95 transition shadow-lg shrink-0"
              >
                Vào Phòng Thi →
              </button>
            </form>
          </div>
        </div>

        {/* AI Tutor Insights */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Nhận Xét Của AI Proctor
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              &ldquo;Trong bài thi Giải tích gần nhất, bạn đã giải rất tốt các câu hỏi lý thuyết nhưng thường mất nhiều thời gian ở các bài toán thực tế tích phân. Đề xuất bạn làm thêm 10 câu luyện tập chuyên sâu.&rdquo;
            </p>
          </div>

          <Link
            href="/student/practice"
            className="w-full text-center py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
          >
            Luyện tập chủ đề được đề xuất →
          </Link>
        </div>
      </div>
    </RoleDashboardShell>
  );
}
