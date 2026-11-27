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
  if (!user) {
    redirect("/auth/login?callbackUrl=/student/ai-analysis");
  }
  if (user.role === "instructor") {
    redirect("/instructor");
  }

  const resolvedParams = await searchParams;
  const initialAttemptId = resolvedParams.attemptId;
  const initialPrompt = resolvedParams.q;

  await connectDB();

  // Lấy toàn bộ các bài thi/bài luyện đã nộp (bao gồm tự động thu bài khi hết giờ)
  const rawAttempts = await ExamAttempt.find({
    user_id: new mongoose.Types.ObjectId(user.id),
    status: { $in: ["submitted", "timed_out"] },
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
      select: "title max_score",
    })
    .lean();

  // Tổng hợp thống kê dài hạn (quy đổi điểm về thang 10 thống nhất)
  const totalAttempts = rawAttempts.length;
  let totalNormalizedScore10 = 0;
  let totalQuestions = 0;
  let totalCorrect = 0;

  const topicMap = new Map<
    string,
    { topic_id?: string; topic_name: string; total: number; wrong: number }
  >();

  for (const att of rawAttempts) {
    const examMeta = att.exam_id as { title?: string; max_score?: number } | null;
    const maxScore = examMeta?.max_score || 10;
    const rawScore = att.score || 0;
    const norm10 = maxScore > 0 ? (rawScore / maxScore) * 10 : rawScore;
    totalNormalizedScore10 += norm10;
    totalCorrect += att.total_correct || 0;
    totalQuestions += (att.total_correct || 0) + (att.total_wrong || 0);

    if (Array.isArray(att.answers)) {
      for (const ans of att.answers) {
        const q = ans.question_id as {
          topic_id?: { _id?: unknown; topic_name?: string } | null;
        } | null;
        const topicId = q?.topic_id?._id ? String(q.topic_id._id) : undefined;
        const topicName = q?.topic_id?.topic_name || "Chưa phân loại";

        if (!topicMap.has(topicName)) {
          topicMap.set(topicName, {
            topic_id: topicId,
            topic_name: topicName,
            total: 0,
            wrong: 0,
          });
        }

        const entry = topicMap.get(topicName)!;
        if (!entry.topic_id && topicId) entry.topic_id = topicId;
        entry.total += 1;
        if (!ans.is_correct) {
          entry.wrong += 1;
        }
      }
    }
  }

  const averageScore = totalAttempts > 0 ? totalNormalizedScore10 / totalAttempts : 0;
  const accuracyRate =
    totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  // Thống nhất ngưỡng đánh giá: < 50% đúng (sai > 50%) là yếu, >= 75% đúng (sai <= 25%) là vững
  const topicList: ITopicStat[] = Array.from(topicMap.values()).map((t) => {
    const wrong_rate = t.total > 0 ? (t.wrong / t.total) * 100 : 0;
    const accuracy_rate = 100 - wrong_rate;
    let status: "weak" | "average" | "good" = "average";
    if (accuracy_rate < 50) status = "weak";
    else if (accuracy_rate >= 75) status = "good";

    return {
      topic_id: t.topic_id,
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
    .filter((t) => t.status === "good" && t.total_questions >= 2)
    .sort((a, b) => a.wrong_rate - b.wrong_rate);

  const recentAttempts = rawAttempts.slice(0, 5).map((att) => {
    const exam = att.exam_id as { title?: string; max_score?: number } | null;
    const maxSc = exam?.max_score || 10;
    const rawSc = att.score || 0;
    const normSc = maxSc > 0 ? Math.round(((rawSc / maxSc) * 10) * 10) / 10 : rawSc;
    return {
      id: att._id.toString(),
      title: exam?.title || att.practice_title || "Bài luyện tập",
      score: normSc,
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
      title="Phân Tích Lỗ Hổng Kiến Thức"
      subtitle="Bảng theo dõi các điểm yếu, thế mạnh và tiến trình ôn luyện dài hạn từ lịch sử làm bài"
    >
      <StudentAiAnalysisView
        stats={stats}
        initialAttemptId={initialAttemptId}
        initialPrompt={initialPrompt}
      />
    </RoleDashboardShell>
  );
}
