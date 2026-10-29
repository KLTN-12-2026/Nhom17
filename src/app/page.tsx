import Link from "next/link";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Header công khai tái sử dụng */}
      <Header />

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center pt-28 sm:pt-36 pb-16 px-4 sm:px-6 lg:px-8 relative">
        {/* Background Decorative Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/15 to-violet-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-emerald-500/15 dark:bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-indigo-500/15 dark:bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-8 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Trung tâm Luyện thi Cấp 3 &amp; ĐGNL Thế hệ mới
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.12]">
            Bứt phá điểm số thi THPT với <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-300 dark:to-violet-400">
              Trí Tuệ Nhân Tạo
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-10 leading-relaxed font-medium">
            Hệ sinh thái luyện thi trắc nghiệm thông minh cho học sinh THPT: Đề thi bám sát ma trận Bộ GD&amp;ĐT,
            phòng thi thử trực tuyến có camera giám sát và chẩn đoán lỗ hổng kiến thức từng môn học cùng Google Gemini AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-13 px-8 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-sm sm:text-base hover:from-blue-500 hover:to-violet-500 active:scale-95 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35"
            >
              <span>Vào luyện đề ngay</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <a
              href="#practice-preview"
              className="w-full sm:w-auto inline-flex items-center justify-center h-13 px-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm sm:text-base hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
            >
              Xem đề thi mẫu
            </a>
          </div>
        </div>

        {/* PRODUCT LIVE MOCKUP (BÀI THI TOÁN 12 CHUẨN THPT QUỐC GIA) */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-2 sm:px-4">
          <div className="rounded-3xl bg-slate-900/5 dark:bg-white/5 p-2 sm:p-4 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 shadow-2xl">
            {/* Header thanh trình duyệt mockup */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-semibold text-slate-400 dark:text-slate-500 hidden sm:inline">
                    ai-quizz.vn/phong-thi-thu/toan-12-chuan-thpt
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Phòng thi thử trực tuyến: Đang tính giờ
                  </span>
                </div>
              </div>

              {/* Nội dung minh họa câu hỏi trắc nghiệm Toán 12 */}
              <div className="p-4 sm:p-8 space-y-6 text-left">
                {/* Thanh trạng thái bài thi */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                      Môn: Toán Học 12 (Ôn Thi THPT Quốc Gia)
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-xs">
                      Mức độ: Vận dụng (Mục tiêu 8+)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs font-bold px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <span>⏱️ Còn lại: 42:15 / 90:00</span>
                  </div>
                </div>

                {/* Nội dung câu hỏi Toán THPT */}
                <div>
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Câu hỏi số 38 / 50
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    Cho hàm số f(x) có đạo hàm f&apos;(x) = x(x - 1)(x + 2)³ với mọi x ∈ ℝ. Số điểm cực trị của hàm số đã cho là bao nhiêu?
                  </h3>
                </div>

                {/* 4 Lựa chọn trả lời */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-xs shrink-0">A</span>
                    <span>1 điểm cực trị</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-xs shrink-0">B</span>
                    <span>2 điểm cực trị</span>
                  </div>

                  <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-sm font-medium text-emerald-900 dark:text-emerald-200 flex items-start gap-3 shadow-xs">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">C</span>
                    <span>3 điểm cực trị (Đáp án đúng - Được Gemini AI xác thực)</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-xs shrink-0">D</span>
                    <span>4 điểm cực trị</span>
                  </div>
                </div>

                {/* Hộp gợi ý & giải thích tự động từ Gemini AI */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/80">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                      🤖 Gemini 1.5 Lời Giải Chi Tiết
                    </span>
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      Bám sát phương pháp giải đề thi Bộ GD&amp;ĐT
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    Phương trình f&apos;(x) = 0 có 3 nghiệm thực: x = 0 (bội 1), x = 1 (bội 1) và x = -2 (bội 3). Vì cả ba nghiệm đều là nghiệm đơn hoặc nghiệm bội lẻ nên đạo hàm f&apos;(x) đều đổi dấu khi đi qua cả 3 giá trị này. Do đó, đồ thị hàm số có đúng 3 điểm cực trị.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: CÔNG NGHỆ AI LUYỆN THI THPT */}
        <section
          id="ai-features"
          className="scroll-mt-24 sm:scroll-mt-28 relative z-10 w-full max-w-6xl mx-auto mt-28 sm:mt-36 px-4"
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Công Nghệ Luyện Thi Đột Phá
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-4 tracking-tight">
              Biên Soạn Đề &amp; Ôn Tập Chuẩn Cấu Trúc Bộ GD&amp;ĐT
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Hệ thống AI tự động phân tích ngân hàng câu hỏi, bám sát ma trận đề thi Tốt nghiệp THPT và kỳ thi Đánh giá năng lực của các trường đại học hàng đầu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1 */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Sinh Đề Tự Động Từ Tài Liệu
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Nạp tệp đề thi thử hoặc tài liệu ôn tập của các trường chuyên, AI tự động nhận diện dạng bài, phân tách đáp án và tạo bộ đề chuẩn hóa trong chớp mắt.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Chia Mức Điểm 7+, 8+, 9+
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Tự động gắn nhãn 4 mức độ nhận thức: Nhận biết, Thông hiểu, Vận dụng và Vận dụng cao. Hỗ trợ hiển thị công thức Toán, Lý, Hóa chuẩn KaTeX rõ ràng.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Bù Đắp Lỗ Hổng Kiến Thức
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                AI phát hiện bạn hay sai ở chuyên đề nào (ví dụ: Hình không gian, Este - Lipit hay Điện xoay chiều) để tự động đề xuất đề luyện bổ trợ tương ứng.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: PHÒNG THI THỬ TRỰC TUYẾN CHỐNG GIAN LẬN */}
        <section
          id="live-proctoring"
          className="scroll-mt-24 sm:scroll-mt-28 relative z-10 w-full max-w-6xl mx-auto mt-28 sm:mt-36 px-4"
        >
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-8 sm:p-14 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Môi Trường Khảo Thí Nghiêm Túc
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 mb-4 tracking-tight">
                Thi Thử Trực Tuyến Như Đi Thi Thật
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8">
                Tổ chức các kỳ thi khảo sát chất lượng định kỳ cho học sinh lớp 10, 11, 12 với công nghệ giám sát thời gian thực bằng Socket.IO.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-xl">🚨</span>
                  <div>
                    <h4 className="font-bold text-sm text-white">Cảnh Báo Chuyển Tab</h4>
                    <p className="text-xs text-slate-400 mt-1">Ghi nhận ngay lập tức khi học sinh chuyển cửa sổ tra cứu tài liệu nhằm rèn luyện tính tự giác.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-xl">🔀</span>
                  <div>
                    <h4 className="font-bold text-sm text-white">Xáo Trộn Đề &amp; Đáp Án</h4>
                    <p className="text-xs text-slate-400 mt-1">Mỗi học sinh trong phòng nhận một mã đề với thứ tự câu hỏi và 4 đáp án hoàn toàn ngẫu nhiên.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-xl">💾</span>
                  <div>
                    <h4 className="font-bold text-sm text-white">Tự Động Lưu Bài</h4>
                    <p className="text-xs text-slate-400 mt-1">Đồng bộ câu trả lời liên tục theo từng giây, không lo mất bài khi gặp sự cố mạng hoặc cúp điện.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-xl">📊</span>
                  <div>
                    <h4 className="font-bold text-sm text-white">Biết Điểm &amp; Xếp Hạng Ngay</h4>
                    <p className="text-xs text-slate-400 mt-1">Hệ thống tự động chấm điểm, hiển thị phổ điểm toàn phòng thi và vị trí xếp hạng của học sinh.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: DÀNH CHO HỌC SINH CẤP 3 */}
        <section
          id="student-experience"
          className="scroll-mt-24 sm:scroll-mt-28 relative z-10 w-full max-w-6xl mx-auto mt-28 sm:mt-36 px-4"
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Góc Học Tập Cấp 3
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-4 tracking-tight">
              Đồng Hành Cùng Sĩ Tử Chinh Phục Điểm 9+
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Mọi công cụ cần thiết để học sinh lớp 10, 11, 12 tự tin nắm chắc kiến thức và bứt phá nguyện vọng 1 vào các trường đại học mơ ước.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Cột 1 */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 hover:border-emerald-500/50 hover:-translate-y-1 transition-all flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold mb-5">
                  📚
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  Luyện Thi Trắc Nghiệm Theo Chuyên Đề
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-6">
                  Ôn tập tự do theo từng chương Toán, Lý, Hóa, Sinh, Tiếng Anh... Bạn có thể tự chọn thời gian và số câu để rèn tốc độ làm bài.
                </p>
                <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <li className="flex items-center gap-2">✓ Bấm giờ tự động chuẩn thời gian thi thật</li>
                  <li className="flex items-center gap-2">✓ Kho câu hỏi phong phú từ lớp 10 đến 12</li>
                </ul>
              </div>
            </div>

            {/* Cột 2 */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-2 border-emerald-500/40 dark:border-emerald-500/30 rounded-3xl p-8 hover:-translate-y-1 transition-all flex flex-col justify-between shadow-xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider">
                Thi Thử Trực Tuyến
              </div>
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xl font-bold mb-5">
                  ⚡
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  Vào Phòng Thi Bằng Mã PIN
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-6">
                  Tham gia các kỳ thi thử của trung tâm chỉ bằng cách nhập mã PIN do thầy cô cấp. Làm bài mượt mà trên cả điện thoại và máy tính.
                </p>
                <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <li className="flex items-center gap-2">✓ Tự động bảo lưu câu trả lời</li>
                  <li className="flex items-center gap-2">✓ Nhận ngay bảng phân tích sau khi nộp bài</li>
                </ul>
              </div>
            </div>

            {/* Cột 3 */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 hover:border-emerald-500/50 hover:-translate-y-1 transition-all flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold mb-5">
                  🎯
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  AI Hướng Dẫn &amp; Phân Tích Câu Sai
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-6">
                  Không chỉ chấm điểm, trợ lý AI giải thích tỉ mỉ phương pháp giải từng câu sai và chỉ ra các bẫy đề thi hay gặp để bạn không tái phạm.
                </p>
                <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <li className="flex items-center gap-2">✓ Lời giải chi tiết từng bước</li>
                  <li className="flex items-center gap-2">✓ Lộ trình đề xuất cải thiện điểm số</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/student"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-md shadow-emerald-600/25"
            >
              <span>Vào góc học tập ngay</span>
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* SECTION 4: KHO ĐỀ THI MẪU CẤP 3 (TOÁN, LÝ, HÓA, ANH 12) */}
        <section
          id="practice-preview"
          className="scroll-mt-24 sm:scroll-mt-28 relative z-10 w-full max-w-6xl mx-auto mt-28 sm:mt-36 px-4"
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Đề Thi Chuẩn Cấu Trúc
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-4 tracking-tight">
              Đề Thi Thử Tốt Nghiệp THPT &amp; ĐGNL Mới Nhất
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Biên soạn bám sát cấu trúc đề minh họa mới nhất của Bộ Giáo dục &amp; Đào tạo và đề thi thử các trường THPT Chuyên toàn quốc.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                  Toán Học 12
                </span>
                <h4 className="font-bold text-lg text-slate-900 dark:text-white mt-3">
                  Đề Thi Thử Tốt Nghiệp THPT — Đề Số 01
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  50 câu trắc nghiệm bao quát toàn bộ chương trình Toán 12: Khảo sát hàm số, Mũ - Logarit, Tích phân và Hình không gian Oxyz.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">⏱️ 90 phút • 50 câu</span>
                <Link href="/student" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Luyện đề ngay →
                </Link>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                  Vật Lý 12
                </span>
                <h4 className="font-bold text-lg text-slate-900 dark:text-white mt-3">
                  Chuyên Đề Dao Động Cơ &amp; Dòng Điện Xoay Chiều
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  40 câu trắc nghiệm chọn lọc từ các trường THPT Chuyên, có đủ các dạng bài tập đồ thị và mạch RLC nối tiếp mục tiêu 8.5+.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">⏱️ 50 phút • 40 câu</span>
                <Link href="/student" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Luyện đề ngay →
                </Link>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  Tiếng Anh THPT
                </span>
                <h4 className="font-bold text-lg text-slate-900 dark:text-white mt-3">
                  Luyện Đề Chuẩn Cấu Trúc Bộ GD&amp;ĐT
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  50 câu ngữ âm, trọng âm, điền từ, tìm lỗi sai và 2 bài đọc hiểu phân loại cao giúp nâng band điểm vững vàng.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">⏱️ 60 phút • 50 câu</span>
                <Link href="/student" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Luyện đề ngay →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: CALL TO ACTION (CTA) */}
        <section className="relative z-10 w-full max-w-5xl mx-auto mt-28 sm:mt-36 px-4">
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white p-8 sm:p-14 text-center shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 leading-tight">
                Sẵn Sàng Tự Tin Bước Vào Kỳ Thi Tốt Nghiệp THPT?
              </h2>
              <p className="text-sm sm:text-base text-blue-100 font-medium mb-8 leading-relaxed">
                Tạo tài khoản học viên hoàn toàn miễn phí ngay hôm nay để luyện đề trắc nghiệm và đánh giá năng lực cùng AI-Quizz.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/register"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-sm sm:text-base hover:bg-slate-100 active:scale-95 transition-all shadow-md"
                >
                  Đăng ký tài khoản học sinh
                </Link>
                <Link
                  href="/auth/login"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm sm:text-base active:scale-95 transition-all"
                >
                  Đăng nhập vào hệ thống
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer công khai tái sử dụng */}
      <Footer />
    </div>
  );
}
