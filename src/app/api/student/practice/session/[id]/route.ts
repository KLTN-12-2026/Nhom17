import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExamAttempt, Question } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import mongoose from "mongoose";

interface IPracticeOptionDoc {
  _id: mongoose.Types.ObjectId;
  option_label: string;
  content: string;
  is_correct: boolean;
}

interface IPracticeQuestionDoc {
  _id: mongoose.Types.ObjectId;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation?: string;
  options?: IPracticeOptionDoc[];
}

interface IPracticeAttemptTopic {
  _id: mongoose.Types.ObjectId;
  topic_name: string;
  level: number;
  subject_id?: mongoose.Types.ObjectId;
}

interface IAttemptAnswerDoc {
  question_id: mongoose.Types.ObjectId;
  selected_option_id?: mongoose.Types.ObjectId | null;
  is_correct?: boolean;
}

interface IPracticeAttemptLeanDoc {
  _id: mongoose.Types.ObjectId;
  attempt_type?: "practice" | "official";
  room_id?: mongoose.Types.ObjectId | null;
  topic_id?: IPracticeAttemptTopic | null;
  practice_title?: string;
  status: string;
  score?: number;
  total_correct?: number;
  total_wrong?: number;
  duration_seconds?: number;
  createdAt: Date;
  answers?: IAttemptAnswerDoc[];
}

/**
 * GET /api/student/practice/session/[id]
 * Lấy dữ liệu phiên tự luyện (dùng khi mở trực tiếp hoặc tải lại trang)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Mã phiên làm bài không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    const attempt = (await ExamAttempt.findOne({
      _id: new mongoose.Types.ObjectId(id),
      user_id: new mongoose.Types.ObjectId(user.id),
    })
      .populate("topic_id", "topic_name level subject_id")
      .lean()) as IPracticeAttemptLeanDoc | null;

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phiên làm bài này" },
        { status: 404 }
      );
    }

    if (attempt.attempt_type === "official" || attempt.room_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể truy cập phiên thi phòng trực tuyến qua API tự luyện.",
        },
        { status: 403 }
      );
    }

    const answersList = attempt.answers || [];

    // Lấy chi tiết các câu hỏi
    const questionIds = answersList.map((a) => a.question_id);
    const questionsFromDb = (await Question.find({
      _id: { $in: questionIds },
    }).lean()) as unknown as IPracticeQuestionDoc[];

    const qMap = new Map<string, IPracticeQuestionDoc>();
    for (const q of questionsFromDb) {
      qMap.set(String(q._id), q);
    }

    // Giữ nguyên thứ tự câu hỏi như trong attempt.answers
    const orderedQuestions = answersList
      .map((ans) => {
        const q = qMap.get(String(ans.question_id));
        if (!q) return null;

        return {
          _id: String(q._id),
          content: q.content,
          difficulty_level: q.difficulty_level,
          explanation: q.explanation || "",
          selected_option_id: ans.selected_option_id
            ? String(ans.selected_option_id)
            : null,
          options: (q.options || []).map((opt) => ({
            _id: String(opt._id),
            option_label: opt.option_label,
            content: opt.content,
            is_correct: Boolean(opt.is_correct),
          })),
        };
      })
      .filter(Boolean);

    const topic = attempt.topic_id;

    return NextResponse.json({
      success: true,
      attempt_id: String(attempt._id),
      topic: {
        _id: topic?._id ? String(topic._id) : null,
        topic_name: topic?.topic_name || attempt.practice_title || "Chuyên đề tự do",
        level: topic?.level || 2,
      },
      status: attempt.status,
      score: attempt.score || 0,
      total_correct: attempt.total_correct || 0,
      total_wrong: attempt.total_wrong || 0,
      duration_seconds: attempt.duration_seconds || 0,
      total_questions: orderedQuestions.length,
      questions: orderedQuestions,
    });
  } catch (error) {
    console.error("Lỗi khi tải phiên làm bài:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải phiên làm bài" },
      { status: 500 }
    );
  }
}
