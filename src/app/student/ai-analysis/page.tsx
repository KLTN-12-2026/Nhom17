// src/app/student/ai-analysis/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import { connectDB } from "@/lib/db";
import { ExamAttempt } from "@/models";
import mongoose from "mongoose";
import StudentAiAnalysisView, {
  IStudentLongTermStats,
  ITopicStat,
} from "@/components/student/student-ai-analysis-view";

interface PageProps {
  searchParams: Promise<{
    attemptId?: string;
    q?: string;
  }>;
}

export default async function StudentAiAnalysisPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "student" && user.role !== "admin")) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const initialAttemptId = resolvedParams.attemptId;
  const initialPrompt = resolvedParams.q;

  await connectDB();

  // Lấy toàn bộ các bài thi/bài luyện đã nộp của học sinh
  const rawAttempts = await ExamAttempt.find({
    user_id: new mongoose.Types.ObjectId(user.id),
    status: "submitted",
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "answers.question_id",
      select: "topic_id",
      populate: {
        path: "topic_id",
        select: "topic_name",
      },
    })
    .populate({
      path: "exam_id",
      select: "title",
    })
    .lean();

  // Tổng hợp thống kê dài hạn
  const totalAttempts = rawAttempts.length;
  let totalScore = 0;
  let totalQuestions = 0;
  let totalCorrect = 0;

  const topicMap = new Map<
    string,
    { topic_name: string; total: number; wrong: number }
  >();

  for (const att of rawAttempts) {
    totalScore += att.score || 0;
    totalCorrect += att.total_correct || 0;
    totalQuestions += (att.total_correct || 0) + (att.total_wrong || 0);

    if (Array.isArray(att.answers)) {
      for (const ans of att.answers) {
        const q = ans.question_id as {
          topic_id?: { _id?: unknown; topic_name?: string } | null;
        } | null;
        const topicName = q?.topic_id?.topic_name || "Chưa phân loại";

        if (!topicMap.has(topicName)) {
          topicMap.set(topicName, { topic_name: topicName, total: 0, wrong: 0 });
        }

        const entry = topicMap.get(topicName)!;
        entry.total += 1;
        if (!ans.is_correct) {
          entry.wrong += 1;
        }
      }
    }
  }

  const averageScore = totalAttempts > 0 ? totalScore / totalAttempts : 0;
  const accuracyRate =
    totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  const topicList: ITopicStat[] = Array.from(topicMap.values()).map((t) => {
    const wrong_rate = t.total > 0 ? (t.wrong / t.total) * 100 : 0;
    let status: "weak" | "average" | "good" = "average";
    if (wrong_rate >= 40) status = "weak";
    else if (wrong_rate <= 20) status = "good";

    return {
      topic_name: t.topic_name,
      total_questions: t.total,
      total_wrong: t.wrong,
      wrong_rate,
      status,
    };
  });

  const weakTopics = topicList
    .filter((t) => t.status === "weak" && t.total_questions >= 2)
    .sort((a, b) => b.wrong_rate - a.wrong_rate);

  const strongTopics = topicList
    .filter((t) => t.wrong_rate <= 25 && t.total_questions >= 3)
    .sort((a, b) => a.wrong_rate - b.wrong_rate);

  const recentAttempts = rawAttempts.slice(0, 5).map((att) => {
    const exam = att.exam_id as { title?: string } | null;
    return {
      id: att._id.toString(),
      title: exam?.title || att.practice_title || "Bài luyện tập",
      score: att.score || 0,
      totalCorrect: att.total_correct || 0,
      totalWrong: att.total_wrong || 0,
      date: new Date(att.submit_time || att.createdAt).toLocaleDateString(
        "vi-VN"
      ),
    };
  });

  const stats: IStudentLongTermStats = {
    totalAttempts,
    averageScore,
    totalQuestions,
    accuracyRate,
    weakTopics,
    strongTopics,
    recentAttempts,
  };

  return (
    <RoleDashboardShell
      user={user}
      title="Phân Tích Lỗ Hổng & Trợ Lý AI"
      subtitle="Bảng theo dõi lỗ hổng kiến thức dài hạn kết hợp Trợ lý AI Agent định hướng ôn luyện cá nhân hóa"
    >
      <StudentAiAnalysisView
        stats={stats}
        initialAttemptId={initialAttemptId}
        initialPrompt={initialPrompt}
      />
    </RoleDashboardShell>
  );
}
