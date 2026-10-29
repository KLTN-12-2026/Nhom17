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
        {/* LƯỚI NỘI DUNG CHÍNH (4 CỘT CHUẨN SẢN PHẨM THẬT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-16">
          {/* CỘT 1: THƯƠNG HIỆU & GIỚI THIỆU (Chiếm 4 cột trên lg) */}
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
                  AI-
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Quizz
                  </span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mt-1">
                  Nền tảng thi &amp; đánh giá thông minh
                </span>
              </div>
            </Link>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal pr-4">
              Nền tảng khảo thí và luyện thi trắc nghiệm trực tuyến thế hệ mới. Tự động biên soạn đề thi,
              giám sát phòng thi thời gian thực và đồng hành nâng cao năng lực cho người học bằng Trí tuệ Nhân tạo.
            </p>

            {/* Trạng thái hệ thống */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hệ thống trực tuyến sẵn sàng phục vụ</span>
            </div>
          </div>

          {/* CỘT 2: TÍNH NĂNG NỔI BẬT (Chiếm 3 cột trên lg) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full inline-block" />
              Khám Phá
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400 font-medium">
              <li>
                <a
                  href="/#ai-features"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-blue-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Sinh câu hỏi tự động bằng AI
                </a>
              </li>
              <li>
                <a
                  href="/#live-proctoring"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-blue-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Giám sát phòng thi Live
                </a>
              </li>
              <li>
                <a
                  href="/#student-experience"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-blue-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Góc học tập &amp; Luyện thi
                </a>
              </li>
              <li>
                <a
                  href="/#practice-preview"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-blue-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Thư viện đề thi mẫu
                </a>
              </li>
            </ul>
          </div>

          {/* CỘT 3: HƯỚNG DẪN & HỖ TRỢ (Chiếm 2 hoặc 3 cột trên lg) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full inline-block" />
              Hỗ Trợ &amp; Quy Chế
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400 font-medium">
              <li>
                <a
                  href="/#live-proctoring"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-indigo-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Quy chế phòng thi trực tuyến
                </a>
              </li>
              <li>
                <a
                  href="/#ai-features"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-indigo-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Hướng dẫn làm bài thi trắc nghiệm
                </a>
              </li>
              <li>
                <Link
                  href="/auth/login"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-indigo-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Đăng nhập tài khoản
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs text-indigo-500 group-hover:translate-x-0.5 transition-transform">➔</span>
                  Đăng ký tài khoản học viên
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 4: THÔNG TIN LIÊN HỆ & TRỢ GIÚP (Chiếm 2 cột trên lg) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-emerald-600 rounded-full inline-block" />
              Liên Hệ
            </h4>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
              <p className="flex items-center gap-2">
                <span>📧</span>
                <span className="font-medium">support@ai-quizz.vn</span>
              </p>
              <p className="flex items-center gap-2">
                <span>💬</span>
                <span className="font-medium">Hỗ trợ kỹ thuật 24/7</span>
              </p>
              <p className="flex items-center gap-2">
                <span>🛡️</span>
                <span className="font-medium">Bảo mật dữ liệu tuyệt đối</span>
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/auth/register"
                className="inline-block px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 transition-colors"
              >
                Bắt đầu học ngay ➔
              </Link>
            </div>
          </div>
        </div>

        {/* DÒNG PHÂN CÁCH CUỐI & BẢN QUYỀN */}
        <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div>
            <p>© 2026 AI-Quizz. Nền tảng khảo thí &amp; đánh giá năng lực trực tuyến.</p>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <a
              href="/#ai-features"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              Giới thiệu
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a
              href="/#live-proctoring"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              Quy chế thi trực tuyến
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-400 dark:text-slate-500">
              Công nghệ Gemini AI
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
