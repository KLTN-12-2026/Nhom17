import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import Link from "next/link";

export default async function InstructorDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/instructor");
  }

  if (user.role !== "instructor" && user.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <RoleDashboardShell
      user={user}
      title="Bảng Điều Khiển Giảng Viên"
      subtitle="Biên soạn ngân hàng câu hỏi AI, tổ chức đề thi và giám sát phòng thi thời gian thực"
    >
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Câu Hỏi Sở Hữu</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">480</div>
          <div className="mt-2 text-xs text-blue-600 font-semibold">
            Có 120 câu hỗ trợ công thức LaTeX
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Đề Thi Đã Xuất Bản</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">18</div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold">
            Bật tính năng xáo đề & đảo đáp án
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Lượt Thi Đã Chấm</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">342</div>
          <div className="mt-2 text-xs text-purple-600 font-semibold">
            Tự động chấm bằng AI & Regex
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Phòng Thi Trực Tiếp</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">1 Đang Mở</div>
          <div className="mt-2 text-xs text-rose-600 font-semibold">
            Mã: THI-TOAN-101 (45 thí sinh)
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="text-lg font-black mb-2">AI Sinh Câu Hỏi Tự Động</h2>
          <p className="text-xs text-blue-100 mb-6 leading-relaxed">
            Nhập tài liệu PDF hoặc chủ đề, hệ thống AI (Gemini 1.5) sẽ phân tích và sinh bộ câu hỏi trắc nghiệm kèm lời giải chi tiết.
          </p>
          <Link
            href="/instructor/questions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 text-xs font-bold hover:bg-blue-50 transition shadow"
          >
            Mở công cụ sinh câu hỏi →
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Mở Phòng Thi Trực Tiếp (Live Room)
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Khởi tạo mã phòng thi thời gian thực bằng Socket.IO. Giám sát thí sinh vào phòng, trạng thái mạng và chống gian lận qua camera.
          </p>
          <Link
            href="/instructor/rooms"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow"
          >
            Quản lý phòng thi →
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Phân Tích Báo Cáo Học Viên
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Xem biểu đồ điểm số, phân tích các chủ đề học sinh thường làm sai nhất để điều chỉnh giáo án giảng dạy phù hợp.
          </p>
          <Link
            href="/instructor/roadmaps"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Xem báo cáo chi tiết →
          </Link>
        </div>
      </div>
    </RoleDashboardShell>
  );
}
