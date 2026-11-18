import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExamAttempt } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import mongoose from "mongoose";

interface IPopulatedSubject {
  _id: mongoose.Types.ObjectId;
  subject_name: string;
}

interface IPopulatedTopic {
  _id: mongoose.Types.ObjectId;
  topic_name: string;
  level: number;
  subject_id?: IPopulatedSubject | null;
}

interface IHistoryAttemptDoc {
  _id: mongoose.Types.ObjectId;
  topic_id?: IPopulatedTopic | null;
  practice_title?: string;
  score?: number;
  total_correct?: number;
  total_wrong?: number;
  duration_seconds?: number;
  submit_time?: Date | null;
  createdAt: Date;
}

/**
 * GET /api/student/practice/history
 * Lấy danh sách lịch sử các lượt tự luyện của học viên
 */
export async function GET() {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();

    const attempts = await ExamAttempt.find({
      user_id: new mongoose.Types.ObjectId(user.id),
      attempt_type: "practice",
      status: "submitted",
    })
      .sort({ createdAt: -1 })
      .populate<{ topic_id: IPopulatedTopic }>({
        path: "topic_id",
        select: "topic_name level subject_id",
        populate: {
          path: "subject_id",
          select: "subject_name",
        },
      })
      .lean();

    let totalScoreSum = 0;
    let totalQuestionsPracticed = 0;
    let totalCorrectPracticed = 0;

    const formattedHistory = (attempts as unknown as IHistoryAttemptDoc[]).map((att) => {
      const topic = att.topic_id;
      const subject = topic?.subject_id;
      const totalQ = (att.total_correct || 0) + (att.total_wrong || 0);

      totalScoreSum += att.score || 0;
      totalQuestionsPracticed += totalQ;
      totalCorrectPracticed += att.total_correct || 0;

      return {
        _id: String(att._id),
        practice_title:
          att.practice_title ||
          (topic?.topic_name ? `Ôn tập: ${topic.topic_name}` : "Tự luyện tổng hợp"),
        subject_name: subject?.subject_name || "Môn học chung",
        topic_name: topic?.topic_name || "Chuyên đề tự do",
        topic_id: topic?._id ? String(topic._id) : null,
        score: att.score || 0,
        total_correct: att.total_correct || 0,
        total_wrong: att.total_wrong || 0,
        total_questions: totalQ,
        duration_seconds: att.duration_seconds || 0,
        submit_time: att.submit_time || att.createdAt,
        created_at: att.createdAt,
      };
    });

    const averageScore =
      formattedHistory.length > 0
        ? Math.round((totalScoreSum / formattedHistory.length) * 10) / 10
        : 0;

    return NextResponse.json({
      success: true,
      history: formattedHistory,
      stats: {
        total_attempts: formattedHistory.length,
        average_score: averageScore,
        total_questions_practiced: totalQuestionsPracticed,
        total_correct_practiced: totalCorrectPracticed,
        accuracy_rate:
          totalQuestionsPracticed > 0
            ? Math.round((totalCorrectPracticed / totalQuestionsPracticed) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Lỗi khi tải lịch sử tự luyện:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải lịch sử tự luyện" },
      { status: 500 }
    );
  }
}
