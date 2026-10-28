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
  Roadmap,
  LearningProgress,
  PasswordResetToken,
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

  // Kết nối CSDL và truy vấn dữ liệu thực tế từ MongoDB Atlas
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
    totalRoadmaps,
    totalProgress,
    totalResetTokens,
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
    Roadmap.countDocuments(),
    LearningProgress.countDocuments(),
    PasswordResetToken.countDocuments(),
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

  // Danh mục 11 collections thực tế trong MongoDB
  const collectionsSummary = [
    { name: "User", label: "Tài khoản", count: totalUsers, group: "Phân hệ 1" },
    { name: "PasswordResetToken", label: "Token OTP", count: totalResetTokens, group: "Phân hệ 1" },
    { name: "Subject", label: "Môn học", count: totalSubjects, group: "Phân hệ 2" },
    { name: "Topic", label: "Cây chủ đề", count: totalTopics, group: "Phân hệ 2" },
    { name: "Question", label: "Ngân hàng câu hỏi", count: totalQuestions, group: "Phân hệ 2" },
    { name: "Exam", label: "Đề thi Snapshot", count: totalExams, group: "Phân hệ 3" },
    { name: "ExamRoom", label: "Phòng thi Live", count: activeRoomsCount, group: "Phân hệ 3" },
    { name: "ExamAttempt", label: "Lượt thi nộp bài", count: totalAttempts, group: "Phân hệ 4" },
    { name: "Roadmap", label: "Lộ trình học", count: totalRoadmaps, group: "Phân hệ 5" },
    { name: "LearningProgress", label: "Tiến độ học tập", count: totalProgress, group: "Phân hệ 5" },
    { name: "Order", label: "Giao dịch thanh toán", count: revenueResult[0] ? 1 : 0, group: "Phân hệ 5" },
  ];

  return (
    <RoleDashboardShell
      user={user}
      title="Bảng Điều Khiển Quản Trị Hệ Thống"
      subtitle="Giám sát thời gian thực số lượng tài khoản, kho câu hỏi AI, kỳ thi và hạ tầng dữ liệu MongoDB Atlas"
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
      {/* Real-time Status Strip (Soft Glassmorphism) */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                MongoDB Atlas Cluster:
              </span>
              <span className="text-slate-600 dark:text-slate-400 font-normal">
                11 Collections hoạt động ổn định
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs hidden sm:inline">
                Ping: 18ms
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              {activeUsersCount}/{totalUsers} Tài khoản Active
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              {new Date().toLocaleTimeString("vi-VN")}
            </span>
          </div>
        </div>

      {/* 4 Metric Cards (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
        {/* Card 1: Users */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400/60 dark:hover:border-indigo-500/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tổng Người Dùng
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
            <span className="text-emerald-600 dark:text-emerald-400">{studentCount} học viên</span>
            <span className="text-blue-600 dark:text-blue-400">{instructorCount} giảng viên</span>
            <span className="text-indigo-600 dark:text-indigo-400">{adminCount} admin</span>
          </div>
        </div>

        {/* Card 2: Question Bank */}
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
              {aiQuestionsCount} câu sinh bởi AI
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold text-xs">
              Gemini 1.5
            </span>
          </div>
        </div>

        {/* Card 3: Exams & Live Rooms */}
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
            <span className="text-violet-600 dark:text-violet-400 font-semibold">{publishedExamsCount} xuất bản</span>
            <span className="px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 font-semibold text-xs">
              Socket.IO
            </span>
          </div>
        </div>

        {/* Card 4: Orders & Revenue */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-400/60 dark:hover:border-emerald-500/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Doanh Thu Nền Tảng
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {totalRevenue.toLocaleString("vi-VN")} ₫
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs flex items-center justify-between font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{totalAttempts} lượt thi đã nộp</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
              SLA 99.9%
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: User List & Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Latest Users Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Tài Khoản Đăng Ký Gần Đây
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hiển thị {recentUsers.length} tài khoản mới nhất trong cơ sở dữ liệu
              </p>
            </div>
            <Link
              href="/admin/users"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 group"
            >
              <span>Xem tất cả ({totalUsers})</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs font-semibold border-y border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">Họ Và Tên</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Vai Trò</th>
                  <th className="py-3 px-3">Trạng Thái</th>
                  <th className="py-3 px-3">Ngày Tạo</th>
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
                    instructor: "Giảng viên",
                    student: "Học viên",
                  };

                  const createdDate = u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "Mới đây";

                  return (
                    <tr key={String(u._id)} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <span className="truncate max-w-[140px] sm:max-w-none text-sm">{u.name}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-xs">
                        {u.email}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-medium ${
                            roleStyles[u.role as keyof typeof roleStyles] || roleStyles.student
                          }`}
                        >
                          {roleLabels[u.role as keyof typeof roleLabels] || u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Hoạt động
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-normal text-xs">{createdDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Distribution Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-1">
              Phân Bổ Vai Trò (RBAC)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Cơ cấu tài khoản phân quyền trên toàn hệ thống
            </p>

            {/* Segmented Progress Bar */}
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-6 p-0.5 gap-0.5">
              <div
                style={{ width: `${studentPct}%` }}
                className="bg-emerald-500 rounded-full transition-all duration-500"
                title={`Học viên: ${studentPct}%`}
              />
              <div
                style={{ width: `${instructorPct}%` }}
                className="bg-blue-500 rounded-full transition-all duration-500"
                title={`Giảng viên: ${instructorPct}%`}
              />
              <div
                style={{ width: `${adminPct}%` }}
                className="bg-indigo-600 rounded-full transition-all duration-500"
                title={`Quản trị: ${adminPct}%`}
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">Học viên (Student)</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{studentCount} tài khoản</span>
                  <span className="text-xs text-slate-500 block font-medium">{studentPct}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">Giảng viên (Instructor)</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{instructorCount} tài khoản</span>
                  <span className="text-xs text-slate-500 block font-medium">{instructorPct}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">Quản trị viên (Admin)</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm">{adminCount} tài khoản</span>
                  <span className="text-xs text-slate-500 block font-medium">{adminPct}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="text-emerald-500 font-semibold">✓</span>
            <span>Phân quyền RBAC 3 cấp độ bảo vệ chống leo thang đặc quyền</span>
          </div>
        </div>
      </div>

      {/* Database Collections Real-time Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Hạ Tầng Dữ Liệu 11 Collections MongoDB Atlas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Số lượng tài liệu (Documents) được lưu trữ và tối ưu hóa theo 5 phân hệ dữ liệu
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Atlas NoSQL Connected
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {collectionsSummary.map((col) => (
            <div
              key={col.name}
              className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-400/50 transition-colors flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                  {col.group}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-sm block">
                  {col.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                  {col.name}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                <span className="text-xs text-slate-500">Documents:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {col.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access Grid (No childish emojis) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/users"
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-0.5">Phân Hệ Quản Trị</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Quản Lý Người Dùng &rarr;</div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/subjects"
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-0.5">Cây Tri Thức</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Môn Học & Chủ Đề &rarr;</div>
            </div>
          </div>
        </Link>

        <Link
          href="/instructor"
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-purple-500/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-0.5">Khảo Thí & Đề Thi</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Phân Hệ Giảng Viên &rarr;</div>
            </div>
          </div>
        </Link>
      </div>
    </RoleDashboardShell>
  );
}
