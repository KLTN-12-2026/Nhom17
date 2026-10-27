import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  if (user.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <RoleDashboardShell
      user={user}
      title="Bảng Điều Khiển Quản Trị Hệ Thống"
      subtitle="Giám sát toàn diện người dùng, ngân hàng tri thức, phòng thi và doanh thu tài chính"
    >
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Tài Khoản</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">128</div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <span>↑ 12%</span>
            <span className="text-slate-400 font-normal">so với tuần trước</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ngân Hàng Câu Hỏi</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">1,450</div>
          <div className="mt-2 text-xs text-indigo-600 font-semibold">
            68% do AI tổng hợp tự động
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Đề Thi Hoạt Động</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">48</div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            3 phòng thi trực tuyến đang mở
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Doanh Thu Khóa Học</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">24.500.000 đ</div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold">
            52 giao dịch MoMo / VNPay
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Phân Hệ Người Dùng & Phân Quyền (RBAC)
          </h2>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Kiểm soát tài khoản toàn trường. Cấp quyền Giáo viên, Quản trị viên hoặc vô hiệu hóa tài khoản vi phạm.
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <span className="font-semibold">Học viên (student)</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">110 tài khoản</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <span className="font-semibold">Giáo viên (instructor)</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">16 tài khoản</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <span className="font-semibold">Quản trị viên (admin)</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">2 tài khoản</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Trạng Thái Cơ Sở Dữ Liệu 11 Models (MongoDB)
          </h2>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Hệ thống 11 Collections hoạt động ổn định trên kiến trúc NoSQL Document.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Lượt thi</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">ExamAttempt</span>
              <span className="text-[11px] text-emerald-500 block font-semibold">● Atomic I/O</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Cây tri thức</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">Topic Tree</span>
              <span className="text-[11px] text-indigo-500 block font-semibold">● Self-reference</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Xác thực OTP</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">PasswordReset</span>
              <span className="text-[11px] text-amber-500 block font-semibold">● TTL Index 20m</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Đề thi Snapshot</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">Exam Snapshot</span>
              <span className="text-[11px] text-emerald-500 block font-semibold">● Pre-validate</span>
            </div>
          </div>
        </div>
      </div>
    </RoleDashboardShell>
  );
}
