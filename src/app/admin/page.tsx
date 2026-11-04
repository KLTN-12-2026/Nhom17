import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import { connectDB } from "@/lib/db";
import {
  User,
  Question,
  Exam,
  ExamRoom,
  ExamAttempt,
  Order,
  Subject,
  Topic,
} from "@/models";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  if (user.role !== "admin") {
    redirect("/unauthorized");
  }

  // Kết nối CSDL và truy vấn dữ liệu thực tế
  await connectDB();

  const [
    totalUsers,
    studentCount,
    instructorCount,
    adminCount,
    activeUsersCount,
    totalQuestions,
    aiQuestionsCount,
    totalExams,
    publishedExamsCount,
    activeRoomsCount,
    totalAttempts,
    revenueResult,
    totalSubjects,
    totalTopics,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "instructor" }),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ status: "active" }),
    Question.countDocuments(),
    Question.countDocuments({ is_ai_generated: true }),
    Exam.countDocuments(),
    Exam.countDocuments({ is_published: true }),
    ExamRoom.countDocuments({ status: "in_progress" }),
    ExamAttempt.countDocuments(),
    Order.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Subject.countDocuments(),
    Topic.countDocuments(),
    User.find({})
      .select("name email role status createdAt")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
  ]);

  const totalRevenue = revenueResult[0]?.total ?? 0;

  // Tính phần trăm phân bố người dùng
  const studentPct = totalUsers > 0 ? Math.round((studentCount / totalUsers) * 100) : 0;
  const instructorPct = totalUsers > 0 ? Math.round((instructorCount / totalUsers) * 100) : 0;
  const adminPct = totalUsers > 0 ? Math.round((adminCount / totalUsers) * 100) : 0;

  return (
    <RoleDashboardShell
      user={user}
      title="Bàn Làm Việc Quản Trị Hệ Thống"
      subtitle="Tổng quan hoạt động khảo thí, giám sát kỳ thi trực tuyến và điều hành tài nguyên học tập toàn trường"
      actions={
        <>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Quản Lý Tài Khoản</span>
          </Link>

          <Link
            href="/admin/subjects"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition shadow-2xs"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Cây Môn Học</span>
          </Link>
        </>
      }
    >
      {/* 1. Trạng Thái Vận Hành Khảo Thí Trong Ngày */}
      <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-slate-50/80 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-950/60 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                Hệ Thống Khảo Thí Trực Tuyến Đang Vận Hành
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Sẵn sàng 100%
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Đồng bộ điểm danh, chống gian lận chuyển tab và tự động thu bài khi hết giờ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{activeUsersCount}</span> / {totalUsers} tài khoản hoạt động
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-500 dark:text-slate-400 shadow-2xs">
            {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • Hôm nay
          </div>
        </div>
      </div>

      {/* 2. Hàng 4 Thẻ KPI Quản Trị Trọng Tâm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
        {/* Card 1: Người dùng */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400/60 dark:hover:border-indigo-500/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tổng Tài Khoản
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {totalUsers.toLocaleString("vi-VN")}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs flex items-center justify-between font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{studentCount} học sinh</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">{instructorCount} giáo viên</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{adminCount} quản trị</span>
          </div>
        </div>

        {/* Card 2: Ngân hàng câu hỏi */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400/60 dark:hover:border-blue-500/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ngân Hàng Câu Hỏi
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {totalQuestions.toLocaleString("vi-VN")}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs flex items-center justify-between font-medium">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {aiQuestionsCount} câu soạn bởi AI
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold text-xs">
              {totalSubjects} môn • {totalTopics} chủ đề
            </span>
          </div>
        </div>

        {/* Card 3: Đề thi & Phòng thi */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-violet-400/60 dark:hover:border-violet-500/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Đề Thi & Phòng Live
            </span>
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {totalExams.toLocaleString("vi-VN")}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs flex items-center justify-between font-medium">
            <span className="text-violet-600 dark:text-violet-400 font-semibold">
              {publishedExamsCount} đề đã phát hành
            </span>
            <span className="px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 font-semibold text-xs">
              {activeRoomsCount} phòng Live
            </span>
          </div>
        </div>

        {/* Card 4: Lượt thi & Kết quả */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-400/60 dark:hover:border-emerald-500/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lượt Thi & Chấm Điểm
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {totalAttempts.toLocaleString("vi-VN")}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs flex items-center justify-between font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Tự động chấm 100%
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
              {totalRevenue > 0 ? `${totalRevenue.toLocaleString("vi-VN")} ₫` : "Học phí chuẩn"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Bảng Người Dùng & Phân Bổ Vai Trò (Đã fix dứt điểm lỗi vỡ chữ) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Bảng tài khoản mới nhất */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Tài Khoản Đăng Ký Gần Đây
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Danh sách giáo viên và học sinh mới tham gia hệ thống
                </p>
              </div>
              <Link
                href="/admin/users"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 group py-1 px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
              >
                <span>Xem tất cả ({totalUsers})</span>
                <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Học Viên / Giáo Viên</th>
                    <th className="py-2.5 px-3">Vai Trò</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Trạng Thái</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Ngày Tham Gia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentUsers.map((u) => {
                    const roleStyles = {
                      admin: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
                      instructor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
                      student: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
                    };

                    const roleLabels = {
                      admin: "Quản trị viên",
                      instructor: "Giáo viên",
                      student: "Học sinh",
                    };

                    const createdDate = u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "Mới đây";

                    return (
                      <tr key={String(u._id)} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {u.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[200px]">
                                {u.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
                              roleStyles[u.role as keyof typeof roleStyles] || roleStyles.student
                            }`}
                          >
                            {roleLabels[u.role as keyof typeof roleLabels] || u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            Hoạt động
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-medium text-xs whitespace-nowrap text-right">
                          {createdDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Hiển thị 6 tài khoản vừa đăng ký</span>
            <Link href="/admin/users" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Quản lý danh sách &rarr;
            </Link>
          </div>
        </div>

        {/* Thẻ Cơ cấu tài khoản trường học */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-1">
              Cơ Cấu Người Dùng Toàn Trường
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Tỉ lệ phân bổ tài khoản học sinh, giáo viên và ban giám hiệu
            </p>

            {/* Segmented Progress Bar */}
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-6 p-0.5 gap-1">
              <div
                style={{ width: `${studentPct}%` }}
                className="bg-emerald-500 rounded-full transition-all duration-500"
                title={`Học sinh: ${studentPct}%`}
              />
              <div
                style={{ width: `${instructorPct}%` }}
                className="bg-blue-500 rounded-full transition-all duration-500"
                title={`Giáo viên: ${instructorPct}%`}
              />
              <div
                style={{ width: `${adminPct}%` }}
                className="bg-indigo-600 rounded-full transition-all duration-500"
                title={`Quản trị: ${adminPct}%`}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Học Sinh Cấp 3</span>
                    <span className="text-[11px] text-slate-500">Luyện thi & làm bài</span>
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{studentCount} tài khoản</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-semibold">{studentPct}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Giáo Viên Bộ Môn</span>
                    <span className="text-[11px] text-slate-500">Soạn đề & mở phòng thi</span>
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{instructorCount} tài khoản</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 block font-semibold">{instructorPct}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Ban Quản Trị</span>
                    <span className="text-[11px] text-slate-500">Điều hành toàn hệ thống</span>
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{adminCount} tài khoản</span>
                  <span className="text-xs text-slate-500 block font-semibold">{adminPct}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Phân quyền 3 cấp độ: Bảo mật tuyệt đối ngân hàng đề thi</span>
          </div>
        </div>
      </div>

      {/* 4. 4 Phân Hệ Nghiệp Vụ Điều Hành Trọng Tâm (Thay thế hoàn toàn 11 ô database vô bổ) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Phân Hệ Nghiệp Vụ Quản Trị & Khảo Thí
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Truy cập nhanh các phân khu điều hành học tập, quản lý ngân hàng đề và kiểm soát kết quả
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Vận hành liên tục 24/7
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Module 1: Quản trị người dùng */}
          <Link
            href="/admin/users"
            className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-800/80 transition-all shadow-2xs flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm mb-3.5 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 transition-colors">
                Quản Trị Người Dùng
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                Quản lý danh sách giáo viên, học sinh, phân quyền và cấp lại quyền truy cập khi cần.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>{totalUsers} Tài khoản</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </div>
          </Link>

          {/* Module 2: Môn học & Cây chủ đề */}
          <Link
            href="/admin/subjects"
            className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-400 hover:bg-white dark:hover:bg-slate-800/80 transition-all shadow-2xs flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm mb-3.5 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 transition-colors">
                Chương Trình & Môn Học
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                Cấu trúc môn học Cấp 3 (Toán, Lý, Hóa...) và ma trận chuyên đề bám sát Bộ GD&ĐT.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span>{totalSubjects} Môn • {totalTopics} Chủ đề</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </div>
          </Link>

          {/* Module 3: Soạn đề & Khảo thí Live */}
          <Link
            href="/instructor"
            className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-violet-400 hover:bg-white dark:hover:bg-slate-800/80 transition-all shadow-2xs flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm mb-3.5 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-violet-600 transition-colors">
                Khảo Thí & Đề Thi Live
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                Tổ chức phòng thi trực tiếp, cấp mã PIN và theo dõi tiến độ nộp bài của thí sinh theo thời gian thực.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-violet-600 dark:text-violet-400">
              <span>{publishedExamsCount} Đề thi • {activeRoomsCount} Phòng live</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </div>
          </Link>

          {/* Module 4: Đơn hàng & Doanh thu */}
          <Link
            href="/admin/orders"
            className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-emerald-400 hover:bg-white dark:hover:bg-slate-800/80 transition-all shadow-2xs flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm mb-3.5 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-600 transition-colors">
                Gói Luyện Thi & Học Phí
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                Quản lý các đơn đăng ký gói luyện thi THPT Quốc Gia, kích hoạt quyền làm bài và xem báo cáo.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>{totalRevenue.toLocaleString("vi-VN")} ₫ Doanh thu</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </div>
          </Link>
        </div>
      </div>
    </RoleDashboardShell>
  );
}
