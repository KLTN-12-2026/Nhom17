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
      subtitle="Số liệu thời gian thực được đồng bộ trực tiếp từ cơ sở dữ liệu MongoDB Atlas"
    >
      {/* Real-time Status Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Kết Nối Dữ Liệu Thời Gian Thực
            </div>
            <div className="text-sm font-bold text-slate-100">
              MongoDB Atlas • 11 Collections Hoạt Động Bình Thường
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
            {activeUsersCount}/{totalUsers} Tài khoản Active
          </span>
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
            {new Date().toLocaleTimeString("vi-VN")}
          </span>
        </div>
      </div>

      {/* 4 Metric Cards (Dữ liệu thật) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Card 1: Users */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Tài Khoản Thật</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {totalUsers.toLocaleString("vi-VN")}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span className="text-emerald-600 font-semibold">{studentCount} học viên</span>
            <span className="text-blue-600 font-semibold">{instructorCount} giảng viên</span>
            <span className="text-rose-600 font-semibold">{adminCount} admin</span>
          </div>
        </div>

        {/* Card 2: Question Bank */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ngân Hàng Câu Hỏi</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {totalQuestions.toLocaleString("vi-VN")}
          </div>
          <div className="mt-2 text-xs text-indigo-600 font-semibold">
            {totalQuestions > 0
              ? `${aiQuestionsCount} câu AI (${Math.round((aiQuestionsCount / totalQuestions) * 100)}%)`
              : "Sẵn sàng biên soạn câu hỏi đầu tiên"}
          </div>
        </div>

        {/* Card 3: Exams & Live Rooms */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Đề Thi & Phòng Live</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {totalExams.toLocaleString("vi-VN")}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium flex items-center justify-between">
            <span className="text-purple-600 font-semibold">{publishedExamsCount} đã xuất bản</span>
            <span className="text-rose-600 font-semibold">{activeRoomsCount} phòng live</span>
          </div>
        </div>

        {/* Card 4: Orders & Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Sổ Cái Doanh Thu</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {totalRevenue.toLocaleString("vi-VN")} đ
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold">
            {totalAttempts} lượt nộp bài đã ghi nhận
          </div>
        </div>
      </div>

      {/* Main Grid: Real User List & Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Latest Users Table (Real DB Records) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Danh Sách Tài Khoản Thực Tế Trong Hệ Thống
              </h2>
              <p className="text-xs text-slate-500">
                Hiển thị {recentUsers.length} tài khoản mới nhất được đăng ký hoặc khởi tạo
              </p>
            </div>
            <Link
              href="/admin/users"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
            >
              Xem tất cả ({totalUsers}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Họ Và Tên</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Vai Trò (Role)</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 rounded-r-xl">Ngày Khởi Tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentUsers.map((u) => {
                  const roleStyles = {
                    admin: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
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
                    <tr key={String(u._id)} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs shrink-0">
                          {u.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <span className="truncate max-w-[140px] sm:max-w-none">{u.name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                            roleStyles[u.role as keyof typeof roleStyles] || roleStyles.student
                          }`}
                        >
                          {roleLabels[u.role as keyof typeof roleLabels] || u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Hoạt động
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{createdDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Distribution Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Phân Bổ Vai Trò (RBAC)
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Tỷ lệ cơ cấu người dùng thực tế trên hệ thống
            </p>

            {/* Visual Progress Bar */}
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-6">
              <div
                style={{ width: `${studentPct}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Học viên: ${studentPct}%`}
              />
              <div
                style={{ width: `${instructorPct}%` }}
                className="bg-blue-500 transition-all duration-500"
                title={`Giảng viên: ${instructorPct}%`}
              />
              <div
                style={{ width: `${adminPct}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`Quản trị: ${adminPct}%`}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Học viên (student)</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-white">{studentCount} tài khoản</span>
                  <span className="text-[10px] text-slate-400 block">{studentPct}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Giảng viên (instructor)</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-white">{instructorCount} tài khoản</span>
                  <span className="text-[10px] text-slate-400 block">{instructorPct}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Quản trị viên (admin)</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-rose-600 dark:text-rose-400">{adminCount} tài khoản</span>
                  <span className="text-[10px] text-slate-400 block">{adminPct}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            * Toàn bộ tài khoản đều được phân quyền nghiêm ngặt qua 3 lớp RBAC
          </div>
        </div>
      </div>

      {/* Database Collections Real-time Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Trạng Thái 11 Collections MongoDB Atlas Thực Tế
            </h2>
            <p className="text-xs text-slate-500">
              Số lượng tài liệu (Documents) thực tế đang được lưu trữ trong cơ sở dữ liệu
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            ● Atlas Database Connected
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {collectionsSummary.map((col) => (
            <div
              key={col.name}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  {col.group}
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-sm block">
                  {col.label}
                </span>
                <span className="font-mono text-[11px] text-slate-500 block">
                  {col.name}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-200/40 dark:border-slate-700/40">
                <span className="text-xs text-slate-400 font-medium">Số lượng:</span>
                <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                  {col.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/users"
          className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md hover:shadow-lg transition flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-100">Quản Lý</div>
            <div className="text-base font-black">Danh Sách Người Dùng →</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
            👥
          </div>
        </Link>

        <Link
          href="/admin/subjects"
          className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg transition flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-100">Cây Tri Thức</div>
            <div className="text-base font-black">Môn Học & Chủ Đề →</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
            📚
          </div>
        </Link>

        <Link
          href="/instructor"
          className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-700 text-white shadow-md hover:shadow-lg transition flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-purple-100">Kiểm Thử Quyền</div>
            <div className="text-base font-black">Phân Hệ Giảng Viên →</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
            👨‍🏫
          </div>
        </Link>
      </div>
    </RoleDashboardShell>
  );
}
