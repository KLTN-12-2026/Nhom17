//src\app\unauthorized\page.tsx
import Link from "next/link";
import LogoutButton from "@/components/auth/logout-button";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans selection:bg-rose-500/20 selection:text-rose-600">
      {/* Header đồng bộ toàn hệ thống */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center pt-28 pb-16 px-4 sm:px-6 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-lg w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 sm:p-10 text-center shadow-2xl relative z-10">
          {/* Warning Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6 shadow-inner">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Status Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 mb-4">
            Lỗi 403 • Quyền hạn không đủ
          </span>

          {/* Headings */}
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            Không Có Quyền Truy Cập
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
            Tài khoản hiện tại của bạn không có thẩm quyền truy cập vào phân hệ này.
            Hệ thống an ninh RBAC 3 lớp đã tự động ngăn chặn để bảo vệ dữ liệu.
            Vui lòng đăng nhập với tài khoản có quyền phù hợp hoặc quay về trang chủ.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition shadow-lg shadow-blue-500/25"
            >
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Về Bàn Làm Việc
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Về Trang Chủ
            </Link>

            <div className="w-full sm:w-auto">
              <LogoutButton variant="ghost" className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer đồng bộ toàn hệ thống */}
      <Footer />
    </div>
  );
}
