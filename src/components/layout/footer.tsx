import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* LƯỚI NỘI DUNG CHÍNH */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 mb-12">
          {/* CỘT 1: THƯƠNG HIỆU & GIỚI THIỆU */}
          <div className="lg:col-span-5 space-y-3">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="min-w-7 h-7 px-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-[10px] tracking-tight shadow-2xs group-hover:scale-105 transition-transform">
                PQP
              </div>
              <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white leading-none">
                AI-Quizz
              </span>
            </Link>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Hệ thống khảo thí và luyện thi trắc nghiệm trực tuyến chuẩn Bộ GD&amp;ĐT. Biên soạn đề thi,
              giám sát phòng thi thời gian thực và chẩn đoán lỗ hổng kiến thức bằng AI.
            </p>

            <div className="inline-flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Hệ thống trực tuyến sẵn sàng</span>
            </div>
          </div>

          {/* CỘT 2: TÍNH NĂNG NỔI BẬT */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Khám Phá
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/#ai-features" className="hover:text-slate-900 dark:hover:text-white transition">
                  Sinh câu hỏi tự động
                </Link>
              </li>
              <li>
                <Link href="/#live-proctoring" className="hover:text-slate-900 dark:hover:text-white transition">
                  Giám sát phòng thi Live
                </Link>
              </li>
              <li>
                <Link href="/#student-experience" className="hover:text-slate-900 dark:hover:text-white transition">
                  Góc học tập &amp; Luyện thi
                </Link>
              </li>
              <li>
                <Link href="/#practice-preview" className="hover:text-slate-900 dark:hover:text-white transition">
                  Thư viện đề thi mẫu
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 3: HƯỚNG DẪN & HỖ TRỢ */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Hỗ Trợ
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/#live-proctoring" className="hover:text-slate-900 dark:hover:text-white transition">
                  Quy chế phòng thi
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-slate-900 dark:hover:text-white transition">
                  Đăng nhập
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-slate-900 dark:hover:text-white transition">
                  Đăng ký tài khoản
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 4: THÔNG TIN LIÊN HỆ */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Liên Hệ
            </h4>
            <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <p className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>support@ai-quizz.vn</span>
              </p>
              <p className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Hỗ trợ 24/7</span>
              </p>
            </div>
          </div>
        </div>

        {/* BẢN QUYỀN */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <p>© 2026 AI-Quizz. Nền tảng khảo thí &amp; đánh giá năng lực trực tuyến.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300 transition">
              Trang chủ
            </Link>
            <span>•</span>
            <Link href="/#ai-features" className="hover:text-slate-600 dark:hover:text-slate-300 transition">
              Tính năng AI
            </Link>
            <span>•</span>
            <span className="text-slate-400">Phiên bản 2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
