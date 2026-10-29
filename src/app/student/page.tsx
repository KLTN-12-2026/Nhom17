//src\app\student\page.tsx
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
      actions={
        <Link
          href="/student/join-room"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>Vào Phòng Thi Live</span>
        </Link>
      }
    >
      {/* Banner Đếm ngược kỳ thi & Động lực học tập */}
      <div className="relative rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 p-6 sm:p-8 text-white mb-8 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-blue-100 backdrop-blur-md mb-3 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Lộ Trình Bứt Phá Mục Tiêu Điểm 8.5+
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              Chào bạn {user.name ? user.name.split(" ").slice(-1)[0] : "học viên"}! 👋
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-blue-100 leading-relaxed font-normal">
              Mỗi ngày hoàn thành 1 chuyên đề trắc nghiệm là bạn đã tiến thêm một bước vững chắc đến cánh cửa trường đại học mơ ước. Hãy cùng AI bứt phá hôm nay!
            </p>
          </div>

          {/* Hộp đếm ngược kỳ thi */}
          <div className="shrink-0 flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <div className="text-center px-3 py-1 border-r border-white/20">
              <span className="block text-2xl sm:text-3xl font-black text-amber-300">238</span>
              <span className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">Ngày thi THPT</span>
            </div>
            <div className="text-left text-xs leading-tight pr-2">
              <div className="font-bold text-white">Kỳ thi Tốt nghiệp 2026</div>
              <div className="text-[11px] text-blue-200 mt-0.5">Mục tiêu: Đạt 26+ Khối A/A1/D</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bài Thi Đã Nộp
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            24
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span>↑</span>
            <span>Tỷ lệ đạt chuẩn: 91.6%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Điểm Trung Bình
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            8.4 <span className="text-base font-normal text-slate-400">/ 10</span>
          </div>
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
            Xếp loại: Giỏi toàn diện
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Câu Hỏi Đã Luyện
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            580 <span className="text-base font-normal text-slate-400">câu</span>
          </div>
          <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-semibold">
            Độ chính xác trung bình: 84%
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cảnh Báo Lỗ Hổng AI
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            2 <span className="text-base font-normal text-slate-400">chủ đề</span>
          </div>
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-semibold truncate">
            Cần bổ trợ: Đạo hàm &amp; Sóng cơ
          </div>
        </div>
      </div>

      {/* Main Student Hub (2 cột: Vào phòng thi + Trợ lý AI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Join Live Room Prompt */}
        <div className="lg:col-span-2 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 max-w-lg">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              Phòng Thi Thời Gian Thực (Socket.IO)
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">
              Nhập mã phòng thi từ giáo viên
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 mb-6 leading-relaxed">
              Bạn có mã ca thi do thầy cô cấp? Nhập mã phòng (ví dụ:{" "}
              <code className="bg-white/20 px-2 py-0.5 rounded font-mono font-bold">
                THI-TOAN-101
              </code>
              ) để bước vào phòng thi trực tiếp, kết nối giám sát webcam AI và làm bài tính giờ chuẩn.
            </p>
            <form
              action="/student/join-room"
              method="GET"
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                name="room_code"
                placeholder="Nhập mã phòng (VD: THI-TOAN-101)"
                className="px-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 font-mono font-bold text-sm outline-none focus:ring-4 focus:ring-white/30 flex-1 uppercase"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 active:scale-95 transition shadow-lg shrink-0 cursor-pointer"
              >
                Vào Phòng Thi →
              </button>
            </form>
          </div>
        </div>

        {/* AI Tutor Insights */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Chẩn Đoán Từ Gemini AI
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              &ldquo;Trong đề thi thử Toán gần nhất, bạn giải rất nhanh các câu nhận biết hàm số nhưng mất nhiều thời gian ở bài toán thực tế cực trị bậc 3. Đề xuất làm thêm 10 câu vận dụng.&rdquo;
            </p>
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">Chủ đề cần cải thiện:</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 font-medium">Toán: Cực trị hàm số</span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 font-medium">Lý: Sóng dừng</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/student/practice"
              className="w-full inline-block text-center py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
            >
              Luyện tập bổ trợ kiến thức →
            </Link>
          </div>
        </div>
      </div>

      {/* KHU VỰC CHI TIẾT: Lịch Sử Bài Thi & Tiến Độ Môn Học */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bảng bài thi gần đây (US 16) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Lịch Sử Luyện Đề Gần Nhất
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Các bài thi trắc nghiệm bạn đã hoàn thành gần đây</p>
            </div>
            <Link
              href="/student/history"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {[
              {
                title: "Đề Khảo Sát Toán 12 — Chuyên Đề Đạo Hàm & Cực Trị",
                subject: "Toán Học 12",
                score: "9.2",
                time: "42 phút",
                date: "28/10/2026",
                badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
                status: "Đạt Giỏi",
              },
              {
                title: "Đề Thi Thử Vật Lý 12 — Sóng Cơ & Dao Động Điều Hòa",
                subject: "Vật Lý 12",
                score: "8.6",
                time: "48 phút",
                date: "26/10/2026",
                badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
                status: "Khá Giỏi",
              },
              {
                title: "Trắc Nghiệm Tiếng Anh THPT — Chuyên Đề Ngữ Pháp & Đọc Hiểu",
                subject: "Tiếng Anh THPT",
                score: "8.0",
                time: "55 phút",
                date: "24/10/2026",
                badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
                status: "Đạt Chuẩn",
              },
              {
                title: "Đề Tự Luyện Hóa Học 12 — Este & Lipit Nâng Cao",
                subject: "Hóa Học 12",
                score: "7.4",
                time: "50 phút",
                date: "22/10/2026",
                badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
                status: "Cần Cải Thiện",
              },
            ].map((test, idx) => (
              <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {test.subject}
                    </span>
                    <span className="text-[11px] text-slate-400">• {test.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {test.title}
                  </h4>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 dark:text-white">{test.score}</span>
                    <span className="text-xs text-slate-400">/10</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${test.badge}`}>
                    {test.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cột tiến độ theo môn học THPT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Tiến Độ Môn Thi Trọng Tâm
            </h3>
            <p className="text-xs text-slate-500 mb-5">Độ phủ kiến thức ngân hàng câu hỏi THPT</p>

            <div className="space-y-4">
              {[
                { name: "Toán Học 12", percent: 85, count: "280 / 320 câu", color: "bg-blue-600" },
                { name: "Vật Lý 12", percent: 72, count: "180 / 250 câu", color: "bg-indigo-600" },
                { name: "Tiếng Anh THPT", percent: 68, count: "210 / 310 câu", color: "bg-emerald-600" },
                { name: "Hóa Học 12", percent: 55, count: "110 / 200 câu", color: "bg-amber-600" },
              ].map((sub, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-800 dark:text-slate-200">{sub.name}</span>
                    <span className="text-slate-500">{sub.count} ({sub.percent}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sub.color}`}
                      style={{ width: `${sub.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              href="/student/practice"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Luyện thêm đề để tăng độ phủ kiến thức →
            </Link>
          </div>
        </div>
      </div>
    </RoleDashboardShell>
  );
}
