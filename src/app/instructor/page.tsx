//src\app\instructor\page.tsx
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
      title="Bàn Làm Việc Giáo Viên"
      subtitle="Biên soạn ngân hàng câu hỏi AI bám sát Bộ GD-ĐT, tổ chức đề thi và quản lý phòng thi trực tuyến"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/instructor/questions"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Soạn Câu Hỏi AI</span>
          </Link>
          <Link
            href="/instructor/exams"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
          >
            <span>Tạo Đề Thi Mới</span>
          </Link>
        </div>
      }
    >
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Câu Hỏi Sở Hữu
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            480
          </div>
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
            Có 120 câu công thức Toán/Lý/Hóa
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Đề Thi Đã Xuất Bản
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            18
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            Đã bật tính năng xáo đề &amp; đảo đáp án
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lượt Thi Đã Chấm
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            342
          </div>
          <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-semibold">
            Tự động chấm điểm &amp; xuất bảng điểm
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Phòng Thi Đang Mở
            </span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            1 <span className="text-base font-normal text-slate-400">phòng</span>
          </div>
          <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-semibold truncate">
            PIN: THI-TOAN-101 (45 thí sinh)
          </div>
        </div>
      </div>

      {/* 3 Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
              <span className="text-lg">🤖</span>
            </div>
            <h3 className="text-lg font-black mb-2">AI Soạn Đề &amp; Câu Hỏi Tự Động</h3>
            <p className="text-xs text-blue-100 leading-relaxed mb-6 font-normal">
              Nạp tài liệu PDF/Word giáo án, mô hình Gemini 1.5 sẽ tự động phân loại nhận thức Bloom và tạo 4 đáp án trắc nghiệm chuẩn xác.
            </p>
          </div>
          <Link
            href="/instructor/questions"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 text-xs font-bold hover:bg-blue-50 transition shadow-xs cursor-pointer"
          >
            Mở ngân hàng câu hỏi AI →
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 font-bold text-lg">
              ⚡
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Khởi Tạo Phòng Thi Trực Tiếp
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-normal">
              Cấp mã PIN cho học sinh làm bài đồng bộ thời gian thực qua Socket.IO. Giám sát tình trạng chuyển tab và thu bài tự động.
            </p>
          </div>
          <Link
            href="/instructor/rooms"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-xs cursor-pointer"
          >
            Quản lý phòng thi Live →
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 font-bold text-lg">
              📊
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Báo Cáo Phổ Điểm &amp; Lỗ Hổng
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-normal">
              Xem biểu đồ phân bố điểm số học sinh, xuất bảng điểm ra Excel và theo dõi những câu hỏi nhiều thí sinh trả lời sai nhất.
            </p>
          </div>
          <Link
            href="/instructor/analytics"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Xem phân tích phổ điểm →
          </Link>
        </div>
      </div>

      {/* CHI TIẾT: Phòng Thi Đang Mở & Đề Thi Vừa Biên Soạn */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Đề thi đã xuất bản gần nhất (US 8) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Đề Thi Đã Biên Soạn Gần Nhất
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Danh sách các đề thi khảo sát chất lượng cho học sinh</p>
            </div>
            <Link
              href="/instructor/exams"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Quản lý tất cả đề thi →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {[
              {
                title: "Đề Khảo Sát Toán 12 — Giữa Học Kỳ 1 (Chuẩn Ma Trận)",
                subject: "Toán Học 12",
                questions: 50,
                duration: "90 phút",
                date: "28/10/2026",
                status: "Đang mở thi",
                statusClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
              },
              {
                title: "Đề Kiểm Tra Định Kỳ Vật Lý 12 — Sóng Cơ & Âm Học",
                subject: "Vật Lý 12",
                questions: 40,
                duration: "50 phút",
                date: "25/10/2026",
                status: "Đã đóng",
                statusClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
              },
              {
                title: "Đề Thi Thử Tốt Nghiệp Tiếng Anh THPT 2026 — Đợt 1",
                subject: "Tiếng Anh THPT",
                questions: 50,
                duration: "60 phút",
                date: "20/10/2026",
                status: "Đã đóng",
                statusClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
              },
            ].map((exam, idx) => (
              <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {exam.subject}
                    </span>
                    <span className="text-[11px] text-slate-400">• {exam.questions} câu • {exam.duration}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {exam.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${exam.statusClass}`}>
                    {exam.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cột Cơ cấu độ khó câu hỏi (Bloom) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Cơ Cấu Ngân Hàng Câu Hỏi
            </h3>
            <p className="text-xs text-slate-500 mb-5">Phân cấp độ khó Bloom chuẩn thi THPT</p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Mức 1: Nhận biết</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">168 câu (35%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: "35%" }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Mức 2: Thông hiểu</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">192 câu (40%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: "40%" }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Mức 3: Vận dụng</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">120 câu (25%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-purple-600" style={{ width: "25%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              href="/instructor/questions"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Mở rộng kho câu hỏi bằng Gemini AI →
            </Link>
          </div>
        </div>
      </div>
    </RoleDashboardShell>
  );
}
