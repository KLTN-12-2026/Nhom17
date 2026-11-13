import Link from "next/link";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { getCurrentUser } from "@/lib/auth-guards";

export default async function Home() {
  const user = await getCurrentUser();

  const primaryHref =
    user?.role === "instructor"
      ? "/instructor"
      : user?.role === "admin"
      ? "/admin"
      : user
      ? "/student"
      : "/dashboard";

  const primaryLabel =
    user?.role === "instructor"
      ? "Vào bàn làm việc giáo viên"
      : user?.role === "admin"
      ? "Vào trang quản trị"
      : "Vào luyện đề ngay";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans selection:bg-slate-200 dark:selection:bg-slate-800 overflow-x-hidden">
      {/* Header công khai tái sử dụng */}
      <Header />

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 sm:pt-28 pb-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge danh mục */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Khảo thí &amp; Luyện thi trắc nghiệm THPT &amp; ĐGNL</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-5 leading-[1.16]">
            Bứt phá điểm số thi THPT với <br className="hidden sm:block" />
            hệ thống trắc nghiệm thông minh
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            Ngân hàng câu hỏi chuẩn ma trận Bộ GD&amp;ĐT, phòng thi trực tuyến có giám sát thời gian thực
            và trợ lý AI phân tích điểm nghẽn kiến thức từng môn học.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link
              href={primaryHref}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition shadow-2xs"
            >
              <span>{primaryLabel}</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <a
              href="#practice-preview"
              className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-850 transition"
            >
              Xem đề thi mẫu
            </a>
          </div>
        </div>

        {/* PRODUCT LIVE MOCKUP (BÀI THI TOÁN 12 CHUẨN THPT QUỐC GIA) */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-2 sm:px-4">
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden">
            {/* Header thanh trình duyệt mockup */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
                <span className="ml-2 font-mono text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                  ai-quizz.vn/phong-thi-thu/toan-12-chuan-thpt
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Phòng thi trực tuyến: Đang tính giờ</span>
              </div>
            </div>

            {/* Nội dung minh họa câu hỏi trắc nghiệm Toán 12 */}
            <div className="p-5 sm:p-6 space-y-5 text-left">
              {/* Thanh trạng thái bài thi */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    Toán Học 12 (Ôn Thi THPT Quốc Gia)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                    Mức độ: Vận dụng (Mục tiêu 8+)
                  </span>
                </div>
                <div className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Thời gian: 42:15 / 90:00
                </div>
              </div>

              {/* Nội dung câu hỏi Toán THPT */}
              <div>
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Câu hỏi 38 / 50
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-snug">
                  Cho hàm số f(x) có đạo hàm f&apos;(x) = x(x - 1)(x + 2)³ với mọi x ∈ ℝ. Số điểm cực trị của hàm số đã cho là bao nhiêu?
                </h3>
              </div>

              {/* 4 Lựa chọn trả lời */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-semibold text-[11px] shrink-0">
                    A
                  </span>
                  <span>1 điểm cực trị</span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-semibold text-[11px] shrink-0">
                    B
                  </span>
                  <span>2 điểm cực trị</span>
                </div>

                <div className="p-3 rounded-lg border border-emerald-500/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-xs font-medium text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-semibold text-[11px] shrink-0">
                      C
                    </span>
                    <span>3 điểm cực trị</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    ✓ Đáp án đúng
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-semibold text-[11px] shrink-0">
                    D
                  </span>
                  <span>4 điểm cực trị</span>
                </div>
              </div>

              {/* Hộp gợi ý & giải thích tự động từ Gemini AI */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    Lời Giải Chi Tiết
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Bám sát phương pháp giải đề thi Bộ GD&amp;ĐT
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Phương trình f&apos;(x) = 0 có 3 nghiệm thực: x = 0 (bội 1), x = 1 (bội 1) và x = -2 (bội 3). Vì cả ba nghiệm đều là nghiệm bội lẻ nên f&apos;(x) đổi dấu khi đi qua cả 3 điểm này. Do đó, đồ thị hàm số có đúng 3 điểm cực trị.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: CÔNG NGHỆ AI LUYỆN THI THPT */}
        <section
          id="ai-features"
          className="scroll-mt-20 relative z-10 w-full max-w-5xl mx-auto mt-24 sm:mt-28 px-4"
        >
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Năng Lực Cốt Lõi
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 mb-2 tracking-tight">
              Biên Soạn Đề &amp; Ôn Tập Chuẩn Cấu Trúc
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Tự động phân tích ngân hàng câu hỏi, bám sát ma trận đề thi Tốt nghiệp THPT và kỳ thi ĐGNL.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Sinh Đề Tự Động Từ Tài Liệu
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Nạp tệp đề thi thử hoặc tài liệu ôn tập Word/PDF, hệ thống tự động bóc tách câu hỏi, phân định đáp án và gắn nhãn chuẩn hóa.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Phân Tầng Mức Độ Nhận Thức
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Hỗ trợ 4 cấp độ: Nhận biết, Thông hiểu, Vận dụng và Vận dụng cao. Tối ưu hiển thị công thức Toán, Lý, Hóa chuẩn KaTeX rõ nét.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Bù Đắp Lỗ Hổng Kiến Thức
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Nhận diện chính xác các chuyên đề học sinh hay trả lời sai để tự động gợi ý bộ đề luyện tập tăng cường đúng trọng tâm.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: PHÒNG THI THỬ TRỰC TUYẾN CHỐNG GIAN LẬN */}
        <section
          id="live-proctoring"
          className="scroll-mt-20 relative z-10 w-full max-w-5xl mx-auto mt-24 sm:mt-28 px-4"
        >
          <div className="rounded-xl bg-slate-900 text-white p-6 sm:p-10 border border-slate-800 shadow-xl">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Môi Trường Khảo Thí Nghiêm Túc
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold mt-1 mb-2 tracking-tight">
                Thi Thử Trực Tuyến Thời Gian Thực
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Tổ chức các kỳ thi khảo sát chất lượng định kỳ cho học sinh THPT với công nghệ giám sát Socket.IO đồng bộ theo từng giây.
              </p>
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-white">Cảnh Báo Chuyển Tab</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Ghi nhận ngay khi học sinh rời cửa sổ làm bài nhằm rèn luyện tính trung thực và kỷ luật thi cử.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-white">Xáo Trộn Đề &amp; Đáp Án</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Mỗi học sinh trong phòng nhận mã đề riêng với thứ tự câu hỏi và phương án được xáo trộn tự động.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-white">Tự Động Lưu Bài</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Đồng bộ đáp án liên tục, loại bỏ hoàn toàn nguy cơ mất bài thi khi gặp sự cố ngắt kết nối mạng.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-white">Biết Điểm &amp; Phổ Điểm Ngay</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Tự động chấm điểm, hiển thị phổ điểm phân phối toàn phòng thi và xếp hạng tức thì sau khi nộp bài.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* SECTION 3: DÀNH CHO HỌC SINH CẤP 3 */}
        <section
          id="student-experience"
          className="scroll-mt-20 relative z-10 w-full max-w-5xl mx-auto mt-24 sm:mt-28 px-4"
        >
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Góc Học Tập
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 mb-2 tracking-tight">
              Công Cụ Luyện Thi Dành Cho Học Viên
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Chủ động luyện tập, tham gia phòng thi bằng mã PIN và nhận phân tích sửa lỗi chi tiết.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cột 1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs mb-4">
                  01
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                  Luyện Thi Theo Chuyên Đề
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-4">
                  Ôn tập tự do theo từng chương môn Toán, Lý, Hóa, Sinh, Tiếng Anh với tùy chọn giới hạn thời gian.
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-500 font-medium">
                  <li className="flex items-center gap-1.5">✓ Bấm giờ tự động chuẩn thời gian thi thật</li>
                  <li className="flex items-center gap-1.5">✓ Ngân hàng câu hỏi cập nhật theo khối lớp</li>
                </ul>
              </div>
            </div>

            {/* Cột 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs mb-4">
                  02
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                  Vào Phòng Thi Bằng Mã PIN
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-4">
                  Tham gia bài kiểm tra của giáo viên chỉ bằng cách nhập mã PIN mà không cần cài đặt ứng dụng phức tạp.
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-500 font-medium">
                  <li className="flex items-center gap-1.5">✓ Hỗ trợ cả máy tính và thiết bị di động</li>
                  <li className="flex items-center gap-1.5">✓ Tự động bảo lưu câu trả lời</li>
                </ul>
              </div>
            </div>

            {/* Cột 3 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs mb-4">
                  03
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                  Phân Tích &amp; Sửa Lỗi Chi Tiết
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-4">
                  Trợ lý AI phân tích các câu sai, chỉ rõ bản chất sai lầm nhận thức để học sinh tránh tái phạm.
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-500 font-medium">
                  <li className="flex items-center gap-1.5">✓ Lời giải chi tiết từng bước</li>
                  <li className="flex items-center gap-1.5">✓ Đề xuất lộ trình củng cố kiến thức</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href={
                user?.role === "instructor"
                  ? "/instructor"
                  : user?.role === "admin"
                  ? "/admin"
                  : "/student"
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition shadow-2xs"
            >
              <span>
                {user?.role === "instructor"
                  ? "Vào bàn làm việc giáo viên"
                  : user?.role === "admin"
                  ? "Vào trang quản trị"
                  : "Vào góc học tập"}
              </span>
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* SECTION 4: KHO ĐỀ THI MẪU CẤP 3 */}
        <section
          id="practice-preview"
          className="scroll-mt-20 relative z-10 w-full max-w-5xl mx-auto mt-24 sm:mt-28 px-4"
        >
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Đề Thi Chuẩn Hóa
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 mb-2 tracking-tight">
              Đề Thi Thử Tốt Nghiệp THPT &amp; ĐGNL
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Biên soạn bám sát cấu trúc đề minh họa mới nhất của Bộ Giáo dục &amp; Đào tạo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  Toán Học 12
                </span>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white mt-2.5">
                  Đề Thi Thử Tốt Nghiệp THPT — Đề Số 01
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  50 câu trắc nghiệm bao quát toàn bộ chương trình Toán 12: Khảo sát hàm số, Mũ - Logarit, Tích phân và Oxyz.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">90 phút • 50 câu</span>
                <Link href="/student" className="font-medium text-slate-900 dark:text-white hover:underline">
                  Luyện đề ngay →
                </Link>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  Vật Lý 12
                </span>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white mt-2.5">
                  Chuyên Đề Dao Động Cơ &amp; Dòng Điện Xoay Chiều
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  40 câu trắc nghiệm tuyển chọn từ các trường THPT Chuyên, đầy đủ các dạng bài tập đồ thị và mạch RLC.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">50 phút • 40 câu</span>
                <Link href="/student" className="font-medium text-slate-900 dark:text-white hover:underline">
                  Luyện đề ngay →
                </Link>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  Tiếng Anh THPT
                </span>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white mt-2.5">
                  Luyện Đề Chuẩn Cấu Trúc Bộ GD&amp;ĐT
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  50 câu ngữ âm, trọng âm, tìm lỗi sai và 2 bài đọc hiểu phân loại cao giúp nâng band điểm vững vàng.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">60 phút • 50 câu</span>
                <Link href="/student" className="font-medium text-slate-900 dark:text-white hover:underline">
                  Luyện đề ngay →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: CALL TO ACTION (CTA) */}
        <section className="relative z-10 w-full max-w-4xl mx-auto mt-24 sm:mt-28 px-4">
          <div className="rounded-xl bg-slate-900 dark:bg-slate-900 text-white p-8 sm:p-12 text-center border border-slate-800 shadow-xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Sẵn Sàng Bắt Đầu Ôn Luyện Với AI-Quizz?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-normal mb-6 max-w-lg mx-auto">
              Tạo tài khoản học viên để luyện tập theo chuyên đề, tham gia phòng thi trực tuyến và theo dõi tiến độ học tập.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white text-slate-900 font-medium text-xs hover:bg-slate-100 transition shadow-2xs"
              >
                Đăng ký tài khoản học sinh
              </Link>
              <Link
                href="/auth/login"
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium text-xs transition"
              >
                Đăng nhập vào hệ thống
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer công khai tái sử dụng */}
      <Footer />
    </div>
  );
}
