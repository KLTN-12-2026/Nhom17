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

interface IPopulatedExam {
  _id: mongoose.Types.ObjectId;
  title: string;
  max_score?: number;
  subject_id?: IPopulatedSubject | null;
}

interface IPopulatedRoom {
  _id: mongoose.Types.ObjectId;
  room_code: string;
}

interface IHistoryAttemptDoc {
  _id: mongoose.Types.ObjectId;
  attempt_type?: "practice" | "official";
  topic_id?: IPopulatedTopic | null;
  exam_id?: IPopulatedExam | null;
  room_id?: IPopulatedRoom | null;
  practice_title?: string;
  score?: number;
  total_correct?: number;
  total_wrong?: number;
  duration_seconds?: number;
  status?: string;
  submit_time?: Date | null;
  createdAt: Date;
}

/**
 * GET /api/student/practice/history
 * Lấy danh sách lịch sử làm bài (tự luyện và thi phòng trực tuyến) của học viên
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
      status: { $in: ["submitted", "timed_out"] },
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
      .populate<{ exam_id: IPopulatedExam }>({
        path: "exam_id",
        select: "title max_score subject_id",
        populate: {
          path: "subject_id",
          select: "subject_name",
        },
      })
      .populate<{ room_id: IPopulatedRoom }>({
        path: "room_id",
        select: "room_code",
      })
      .lean();

    let totalNormalizedScoreSum = 0;
    let totalQuestionsPracticed = 0;
    let totalCorrectPracticed = 0;

    const formattedHistory = (attempts as unknown as IHistoryAttemptDoc[]).map((att) => {
      const topic = att.topic_id;
      const exam = att.exam_id;
      const room = att.room_id;
      const subject = topic?.subject_id || exam?.subject_id;
      const totalQ = (att.total_correct || 0) + (att.total_wrong || 0);
      const maxScore = exam?.max_score || 10;
      const rawScore = att.score || 0;
      const normalizedScore10 = maxScore > 0 ? (rawScore / maxScore) * 10 : rawScore;

      totalNormalizedScoreSum += normalizedScore10;
      totalQuestionsPracticed += totalQ;
      totalCorrectPracticed += att.total_correct || 0;

      const isOfficial = att.attempt_type === "official" || Boolean(exam);

      return {
        _id: String(att._id),
        attempt_type: isOfficial ? "official" : "practice",
        room_code: room?.room_code || null,
        practice_title:
          att.practice_title ||
          exam?.title ||
          (topic?.topic_name ? `Ôn tập: ${topic.topic_name}` : "Tự luyện tổng hợp"),
        subject_name: subject?.subject_name || "Môn học chung",
        topic_name:
          topic?.topic_name ||
          (room?.room_code ? `Phòng thi ${room.room_code}` : "Đề thi chính thức"),
        topic_id: topic?._id ? String(topic._id) : null,
        score: rawScore,
        max_score: maxScore,
        normalized_score_10: Math.round(normalizedScore10 * 100) / 100,
        total_correct: att.total_correct || 0,
        total_wrong: att.total_wrong || 0,
        total_questions: totalQ,
        duration_seconds: att.duration_seconds || 0,
        status: att.status || "submitted",
        submit_time: att.submit_time || att.createdAt,
        created_at: att.createdAt,
      };
    });

    const averageScore =
      formattedHistory.length > 0
        ? Math.round((totalNormalizedScoreSum / formattedHistory.length) * 10) / 10
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
    console.error("Lỗi khi tải lịch sử làm bài:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải lịch sử làm bài" },
      { status: 500 }
    );
  }
}
