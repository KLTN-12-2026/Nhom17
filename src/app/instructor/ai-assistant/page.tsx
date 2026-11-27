// src/app/instructor/ai-assistant/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import { connectDB } from "@/lib/db";
import { Exam, ExamAttempt } from "@/models";
import mongoose from "mongoose";
import InstructorAiAssistantView, {
  IManagedExamSummary,
} from "@/components/instructor/instructor-ai-assistant-view";

interface PageProps {
  searchParams: Promise<{
    examId?: string;
  }>;
}

export default async function InstructorAiAssistantPage({
  searchParams,
}: PageProps) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "instructor" && user.role !== "admin")) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const initialExamId = resolvedParams.examId;

  await connectDB();

  // Chỉ lấy đề thi mà giáo viên này tạo (hoặc tất cả nếu là admin)
  const examQuery: Record<string, unknown> = {};
  if (user.role === "instructor") {
    examQuery.created_by = new mongoose.Types.ObjectId(user.id);
  }

  const rawExams = await Exam.find(examQuery).sort({ createdAt: -1 }).lean();

  const examIds = rawExams.map((e) => e._id);
  const rawAttempts = await ExamAttempt.find({
    exam_id: { $in: examIds },
    status: "submitted",
  })
    .select("exam_id score")
    .lean();

  // Nhóm số bài nộp và điểm trung bình theo từng đề thi
  const examStatsMap = new Map<
    string,
    { count: number; totalScore: number }
  >();

  for (const att of rawAttempts) {
    if (!att.exam_id) continue;
    const eId = att.exam_id.toString();
    const curr = examStatsMap.get(eId) || { count: 0, totalScore: 0 };
    curr.count += 1;
    curr.totalScore += att.score || 0;
    examStatsMap.set(eId, curr);
  }

  const exams: IManagedExamSummary[] = rawExams.map((e) => {
    const stat = examStatsMap.get(e._id.toString()) || {
      count: 0,
      totalScore: 0,
    };
    return {
      id: e._id.toString(),
      title: e.title,
      totalAttempts: stat.count,
      averageScore: stat.count > 0 ? stat.totalScore / stat.count : 0,
      passScore: e.pass_score || 5,
      isPublished: Boolean(e.is_published),
    };
  });

  return (
    <RoleDashboardShell
      user={user}
      title="Trợ Lý AI Giảng Dạy & Phân Tích Lớp Học"
      subtitle="Ứng dụng mô hình AI Agent hỗ trợ chuẩn đoán phổ điểm, phát hiện câu hỏi khó và tư vấn giải pháp sư phạm"
    >
      <InstructorAiAssistantView
        exams={exams}
        initialExamId={initialExamId}
      />
    </RoleDashboardShell>
  );
}
