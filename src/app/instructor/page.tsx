//src/app/instructor/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import { connectDB } from "@/lib/db";
import { Question, Exam, ExamRoom, ExamAttempt } from "@/models";
import Link from "next/link";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export default async function InstructorDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/instructor");
  }

  if (user.role !== "instructor" && user.role !== "admin") {
    redirect("/unauthorized");
  }

  // Kết nối CSDL MongoDB và truy vấn toàn bộ số liệu thực tế
  await connectDB();

  const teacherObjectId = mongoose.Types.ObjectId.isValid(user.id)
    ? new mongoose.Types.ObjectId(user.id)
    : null;

  // Bộ lọc đề thi của giáo viên (Admin xem toàn bộ đề thi)
  const examFilter = user.role === "admin"
    ? {}
    : teacherObjectId ? { created_by: teacherObjectId } : {};

  const publishedExamFilter = {
    ...examFilter,
    is_published: true,
  };

  // Bộ lọc phòng thi đang mở
  const roomFilter = user.role === "admin"
    ? { status: "in_progress" }
    : teacherObjectId ? { teacher_id: teacherObjectId, status: "in_progress" } : { status: "in_progress" };

  const [
    totalQuestions,
    aiQuestionsCount,
    easyCount,
    mediumCount,
    hardCount,
    totalExams,
    publishedExamsCount,
    activeRooms,
    recentExams,
  ] = await Promise.all([
    Question.countDocuments(),
    Question.countDocuments({ is_ai_generated: true }),
    Question.countDocuments({ difficulty_level: "easy" }),
    Question.countDocuments({ difficulty_level: "medium" }),
    Question.countDocuments({ difficulty_level: "hard" }),
    Exam.countDocuments(examFilter),
    Exam.countDocuments(publishedExamFilter),
    ExamRoom.find(roomFilter).sort({ start_time: -1 }).limit(1).lean(),
    Exam.find(examFilter)
      .populate("subject_id", "subject_name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  // Đếm lượt thi đã nộp bài (chấm điểm) thực tế từ học sinh
  const allMyExams = await Exam.find(examFilter).select("_id").lean();
  const myExamIds = allMyExams.map((e) => e._id);
  const gradedAttemptsCount = myExamIds.length > 0 || user.role === "admin"
    ? await ExamAttempt.countDocuments(
        user.role === "admin"
          ? { status: "submitted" }
          : { exam_id: { $in: myExamIds }, status: "submitted" }
      )
    : 0;

  // Tính phần trăm phân bố độ khó Bloom thực tế từ CSDL
  const easyPct = totalQuestions > 0 ? Math.round((easyCount / totalQuestions) * 100) : 0;
  const mediumPct = totalQuestions > 0 ? Math.round((mediumCount / totalQuestions) * 100) : 0;
  const hardPct = totalQuestions > 0 ? Math.max(0, 100 - easyPct - mediumPct) : 0;

  const activeRoom = activeRooms[0];

  return (
    <RoleDashboardShell
      user={user}
      title="Bàn Làm Việc Giáo Viên"
      subtitle="Biên soạn ngân hàng câu hỏi bám sát ma trận Bộ GD&ĐT, tổ chức đề thi và quản lý phòng thi trực tuyến"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/instructor/questions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-medium text-xs transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Soạn Câu Hỏi AI</span>
          </Link>
          <Link
            href="/instructor/exams"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-xs transition cursor-pointer"
          >
            <span>Tạo Đề Thi Mới</span>
          </Link>
        </div>
      }
    >
      {/* 4 Metric Columns - Unified Ribbon (Linear / Vercel style) */}
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 mb-6 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800">
          {/* Metric 1 */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Câu hỏi sở hữu</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {totalQuestions.toLocaleString("vi-VN")}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {totalQuestions > 0 ? `${aiQuestionsCount} câu AI hỗ trợ` : "Chưa có câu hỏi trong kho"}
            </div>
          </div>

          {/* Metric 2 */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Đề thi đã phát hành</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {publishedExamsCount.toLocaleString("vi-VN")}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {totalExams > 0 ? `Tổng cộng ${totalExams} đề thi đã tạo` : "Chưa có đề thi được tạo"}
            </div>
          </div>

          {/* Metric 3 */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Lượt thi đã chấm</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {gradedAttemptsCount.toLocaleString("vi-VN")}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {gradedAttemptsCount > 0 ? "Chấm điểm tự động từ học sinh" : "Chưa có lượt nộp bài nào"}
            </div>
          </div>

          {/* Metric 4 */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Phòng thi trực tuyến</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {activeRoom ? "1" : "0"} <span className="text-xs font-normal text-slate-400">phòng đang mở</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeRoom ? `Mã PIN: ${activeRoom.room_code}` : "Hiện không có phòng thi mở"}
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Workflow Actions (Clean, Harmonious SaaS Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Workflow 1 */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3.5">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Ngân Hàng Câu Hỏi &amp; AI
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Soạn thủ công, nạp từ file Excel/Word hoặc trích xuất tự động qua Gemini 1.5 bám sát chuyên đề bài học THPT.
            </p>
          </div>
          <Link
            href="/instructor/questions"
            className="inline-flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 text-xs font-medium transition cursor-pointer"
          >
            <span>Mở ngân hàng câu hỏi</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Workflow 2 */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3.5">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Phòng Thi Trực Tuyến Live
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Cấp mã PIN làm bài trực tiếp cho học sinh, giám sát thời gian thực qua Live Socket, phát hiện chuyển tab và thu bài tự động.
            </p>
          </div>
          <Link
            href="/instructor/rooms"
            className="inline-flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium transition cursor-pointer"
          >
            <span>Quản lý phòng thi Live</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Workflow 3 */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3.5">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Báo Cáo Phổ Điểm &amp; Lỗ Hổng
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Theo dõi biểu đồ điểm số học sinh, phân tích ma trận câu hỏi học sinh hay sai và xuất bảng điểm trực tiếp sang Excel.
            </p>
          </div>
          <Link
            href="/instructor/analytics"
            className="inline-flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium transition cursor-pointer"
          >
            <span>Xem phân tích phổ điểm</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Bottom Sections: Recent Exams Table + Bloom Cognitive Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exams (2 Columns) */}
        <div className="lg:col-span-2 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Đề Thi Đã Biên Soạn Gần Nhất
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Dữ liệu đề thi thực tế đã lưu trong hệ thống</p>
            </div>
            <Link
              href="/instructor/exams"
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              Xem tất cả →
            </Link>
          </div>

          {recentExams.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6">
              <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Chưa có đề thi nào được tạo trong hệ thống.
              </p>
              <Link
                href="/instructor/exams"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-medium hover:opacity-90 transition cursor-pointer"
              >
                <span>+</span> Tạo đề thi đầu tiên
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    <th className="pb-2.5 font-medium">Tên đề thi</th>
                    <th className="pb-2.5 font-medium">Môn học</th>
                    <th className="pb-2.5 font-medium">Cấu trúc</th>
                    <th className="pb-2.5 font-medium text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recentExams.map((exam) => {
                    const subjectObj = exam.subject_id as { subject_name?: string } | undefined;
                    const subjectName = subjectObj?.subject_name || "Môn học";
                    const questionCount = exam.total_questions || exam.questions?.length || 0;
                    const formattedDate = exam.createdAt
                      ? new Date(exam.createdAt).toLocaleDateString("vi-VN")
                      : "Mới tạo";

                    return (
                      <tr key={String(exam._id)} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 pr-3">
                          <div className="font-medium text-slate-900 dark:text-white truncate max-w-[240px]">
                            {exam.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Ngày tạo: {formattedDate}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-slate-600 dark:text-slate-400">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                            {subjectName}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          {questionCount} câu • {exam.duration_minutes || 45} phút
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                              exam.is_published
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {exam.is_published ? "Đã phát hành" : "Bản nháp"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bloom Cognitive Distribution (1 Column) */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Cơ Cấu Ngân Hàng Câu Hỏi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Phân bố mức độ nhận thức Bloom thực tế từ CSDL
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Nhận biết (Dễ)
                  </span>
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {easyCount} câu ({easyPct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${easyPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Thông hiểu (Trung bình)
                  </span>
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {mediumCount} câu ({mediumPct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${mediumPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Vận dụng &amp; VDC (Khó)
                  </span>
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {hardCount} câu ({hardPct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-600 transition-all duration-500"
                    style={{ width: `${hardPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <Link
              href="/instructor/questions"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium flex items-center justify-between transition"
            >
              <span>Xem chi tiết trong kho câu hỏi</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </RoleDashboardShell>
  );
}
