//src\components\layout\footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative mt-24 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl font-sans overflow-hidden">
      {/* Hiệu ứng nền ánh sáng trang trí (Decorative Glow) */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-96 h-48 bg-blue-500/10 dark:bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-48 bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />

      {/* Viền màu gradient trang nhã trên đầu footer */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-600/30 via-indigo-600/60 to-emerald-500/30" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        {/* LƯỚI NỘI DUNG CHÍNH (4 CỘT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-16">
          {/* CỘT 1: THƯƠNG HIỆU & THÔNG TIN ĐỒ ÁN (Chiếm 4 cột trên lg) */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
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
              <div>
                <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white leading-none block">
                  Trắc Nghiệm{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    AI
                  </span>
                </span>
              </div>
            </Link>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal pr-4">
              Hệ thống Quản lý và Tổ chức Thi Trắc nghiệm Trực tuyến Tích hợp Trí tuệ
              Nhân tạo (AI). Ứng dụng mô hình NoSQL MongoDB 11 Collections, xác thực 3 lớp RBAC và hỗ trợ phòng thi Live thời gian thực.
            </p>
            {/* Trạng thái hệ thống */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hệ thống AI &amp; Database hoạt động ổn định</span>
            </div>
          </div>

          {/* CỘT 2: CÔNG NGHỆ & TÍNH NĂNG AI (Chiếm 3 cột trên lg) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full inline-block" />
              Tính Năng Đột Phá
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400 font-medium">
              <li>
                <a
                  href="#features"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-blue-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Sinh câu hỏi từ tài liệu (Gemini)
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-blue-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Giám sát camera &amp; chống gian lận
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-blue-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Phân tích lỗ hổng kiến thức học viên
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-blue-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Ngân hàng câu hỏi hỗ trợ LaTeX
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-blue-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Snapshot đề thi &amp; đảo đáp án
                </a>
              </li>
            </ul>
          </div>

          {/* CỘT 3: PHÂN HỆ NGƯỜI DÙNG (RBAC) (Chiếm 2 hoặc 3 cột trên lg) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full inline-block" />
              Phân Hệ Vai Trò
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400 font-medium">
              <li>
                <Link
                  href="/student"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-between group"
                >
                  <span>🎓 Sinh Viên</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold">
                    Student
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/instructor"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-between group"
                >
                  <span>👨‍🏫 Giảng Viên</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold">
                    Instructor
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-between group"
                >
                  <span>👑 Admin</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold">
                    Admin
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/login"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors block"
                >
                  🔐 Cổng Đăng Nhập Hệ Thống
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors block"
                >
                  📝 Đăng Ký Tài Khoản Mới
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 4: CÔNG NGHỆ CHỦ CHỐT (Chiếm 2 cột trên lg) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-violet-600 rounded-full inline-block" />
              Nền Tảng
            </h4>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Next.js 16
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                React 19
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Tailwind v4
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                MongoDB Atlas
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Mongoose 9
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                NextAuth.js
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Gemini
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Socket.IO
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
              Tối ưu hóa thời gian phản hồi với Edge Middleware &amp; Connection Caching.
            </p>
          </div>
        </div>

        {/* DÒNG PHÂN CÁCH CUỐI & BẢN QUYỀN */}
        <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div>
            <p>
              2026 — Bản quyền thuộc về chúng tôi.<strong />Designed with care<strong />.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <a
              href="#features"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              Giới thiệu đề tài
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link
              href="/unauthorized"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              Chính sách an toàn RBAC
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link
              href="/dashboard"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              Quy chế thi trực tuyến
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
