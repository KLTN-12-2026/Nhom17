import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getCurrentUser } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { Exam, ExamAttempt } from "@/models";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import InstructorAnalyticsView, {
  type IExamAnalyticsOverview,
} from "@/components/instructor/instructor-analytics-view";

export const dynamic = "force-dynamic";

export default async function InstructorAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?callbackUrl=/instructor/analytics");
  }
  if (user.role !== "instructor" && user.role !== "admin") {
    redirect("/unauthorized");
  }

  await connectDB();

  const examFilter =
    user.role === "admin"
      ? {}
      : { created_by: new mongoose.Types.ObjectId(user.id) };

  const exams = await Exam.find(examFilter)
    .populate("subject_id", "subject_name")
    .sort({ createdAt: -1 })
    .lean();

  const examIds = exams.map((e) => e._id);
  const attempts =
    examIds.length > 0
      ? await ExamAttempt.find({
          exam_id: { $in: examIds },
          attempt_type: { $ne: "practice" },
          status: { $in: ["submitted", "timed_out"] },
        })
          .populate("user_id", "name email")
          .select(
            "exam_id user_id score total_correct total_wrong duration_seconds submit_time createdAt"
          )
          .sort({ submit_time: -1, createdAt: -1 })
          .lean()
      : [];

  const attemptsByExam = new Map<
    string,
    Array<{
      attempt_id: string;
      student_name: string;
      student_email: string;
      score: number;
      total_correct: number;
      total_wrong: number;
      duration_seconds: number;
      submit_time: string;
    }>
  >();

  for (const att of attempts) {
    if (!att.exam_id) continue;
    const eId = String(att.exam_id);
    const list = attemptsByExam.get(eId) || [];
    const student = att.user_id as { name?: string; email?: string } | null;
    list.push({
      attempt_id: String(att._id),
      student_name: student?.name || "Thí sinh",
      student_email: student?.email || "",
      score: typeof att.score === "number" ? att.score : 0,
      total_correct: att.total_correct || 0,
      total_wrong: att.total_wrong || 0,
      duration_seconds: att.duration_seconds || 0,
      submit_time: (att.submit_time || att.createdAt).toISOString(),
    });
    attemptsByExam.set(eId, list);
  }

  const examItems: IExamAnalyticsOverview[] = exams.map((exam) => {
    const eId = String(exam._id);
    const subjectObj = exam.subject_id as { subject_name?: string } | null;
    const rows = attemptsByExam.get(eId) || [];
    const maxScore = exam.max_score || 10;
    const passScore = exam.pass_score || 5;

    const totalSubmissions = rows.length;
    const avgScore =
      totalSubmissions > 0
        ? Math.round(
            (rows.reduce((sum, r) => sum + r.score, 0) / totalSubmissions) * 10
          ) / 10
        : 0;
    const highestScore =
      totalSubmissions > 0 ? Math.max(...rows.map((r) => r.score)) : 0;
    const lowestScore =
      totalSubmissions > 0 ? Math.min(...rows.map((r) => r.score)) : 0;
    const passRate =
      totalSubmissions > 0
        ? Math.round(
            (rows.filter((r) => r.score >= passScore).length /
              totalSubmissions) *
              100
          )
        : 0;

    return {
      exam_id: eId,
      title: exam.title,
      subject_name: subjectObj?.subject_name || "Môn học chung",
      total_questions: exam.total_questions || exam.questions?.length || 0,
      max_score: maxScore,
      pass_score: passScore,
      is_published: Boolean(exam.is_published),
      total_submissions: totalSubmissions,
      average_score: avgScore,
      highest_score: highestScore,
      lowest_score: lowestScore,
      pass_rate: passRate,
      submissions: rows,
    };
  });

  return (
    <RoleDashboardShell
      user={user}
      title="Báo Cáo Phổ Điểm & Chẩn Đoán Lớp Học AI"
      subtitle="Tổng hợp phổ điểm, nhận diện mảng kiến thức nhiều học sinh bị sai và xuất bảng điểm Excel"
      actions={
        <Link
          href="/instructor/exams"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          ← Quản lý đề thi
        </Link>
      }
    >
      <InstructorAnalyticsView exams={examItems} />
    </RoleDashboardShell>
  );
}
