import Link from "next/link";
import Image from "next/image";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Gọi Component Header tái sử dụng */}
      <Header />

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-16 px-4 sm:px-6 lg:px-8 relative">
        {/* Background Decorative Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/20 dark:bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-emerald-500/20 dark:bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-indigo-500/20 dark:bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Nền tảng Luyện thi Thế hệ mới
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1]">
            Đánh giá năng lực với <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              Trí Tuệ Nhân Tạo
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed font-medium">
            Hệ thống quản lý, tổ chức thi trắc nghiệm trực tuyến thông minh. Tự
            động sinh câu hỏi, giám sát gian lận thời gian thực và phân tích
            điểm yếu cá nhân hóa bằng công nghệ AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-blue-600 text-white font-bold text-sm sm:text-base hover:bg-blue-700 active:scale-95 transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
            >
              Trải nghiệm ngay
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center h-14 px-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm sm:text-base hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
            >
              Khám phá tính năng
            </a>
          </div>
        </div>

        {/* MOCKUP HÌNH ẢNH DỰ ÁN */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4">
          <div className="relative rounded-2xl bg-slate-900/5 dark:bg-white/5 p-2 sm:p-4 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
            <div className="flex items-center gap-2 px-3 pb-3 pt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            </div>

            <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-inner">
              <Image src="https://images.unsplash.com/photo-1676299081847-824916de030a?q=80&w=2000&auto=format&fit=crop" alt="Giao diện nền tảng" fill unoptimized priority className="object-cover w-full h-full hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>

        {/* BẢNG TÍNH NĂNG NỔI BẬT */}
        <div
          id="features"
          className="relative z-10 w-full max-w-6xl mx-auto mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4"
        >
          {/* Card 1 */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-8 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              Sinh Câu Hỏi Tự Động
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Phân tích tài liệu PDF, văn bản để tự động tạo bộ câu hỏi trắc
              nghiệm đa mức độ tích hợp lời giải chi tiết.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-8 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              Giám Sát Live
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Công nghệ đồng bộ thời gian thực. Theo dõi trạng thái thí sinh, tự
              động cảnh báo khi có dấu hiệu gian lận.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-8 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              Lộ Trình Cá Nhân Hóa
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Trí tuệ nhân tạo (Gemini) phân tích lỗ hổng kiến thức qua các bài
              thi, đề xuất lộ trình ôn tập được thiết kế riêng.
            </p>
          </div>
        </div>
      </main>

      {/* Gọi Component Footer tái sử dụng */}
      <Footer />
    </div>
  );
}
