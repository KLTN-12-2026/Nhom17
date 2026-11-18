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

interface IPopulatedOption {
  _id: mongoose.Types.ObjectId;
  option_label: string;
  content: string;
  is_correct: boolean;
}

interface IPopulatedQuestion {
  _id: mongoose.Types.ObjectId;
  content: string;
  difficulty_level: string;
  explanation?: string;
  options?: IPopulatedOption[];
}

interface IPopulatedAnswer {
  question_id: IPopulatedQuestion | mongoose.Types.ObjectId | null;
  selected_option_id?: mongoose.Types.ObjectId | null;
  is_correct?: boolean;
}

interface IAttemptDetailLeanDoc {
  _id: mongoose.Types.ObjectId;
  topic_id?: IPopulatedTopic | null;
  practice_title?: string;
  score?: number;
  total_correct?: number;
  total_wrong?: number;
  duration_seconds?: number;
  submit_time?: Date | null;
  createdAt: Date;
  answers?: IPopulatedAnswer[];
}

/**
 * GET /api/student/practice/history/[id]
 * Xem lại chi tiết một bài làm tự luyện cũ: câu hỏi, đáp án đã chọn, đáp án đúng và lời giải
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
        { success: false, message: "Mã lượt ôn tập không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    const attempt = (await ExamAttempt.findOne({
      _id: new mongoose.Types.ObjectId(id),
      user_id: new mongoose.Types.ObjectId(user.id),
    })
      .populate({
        path: "topic_id",
        select: "topic_name level subject_id",
        populate: {
          path: "subject_id",
          select: "subject_name",
        },
      })
      .populate({
        path: "answers.question_id",
        select: "content difficulty_level explanation options",
      })
      .lean()) as IAttemptDetailLeanDoc | null;

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bài làm tự luyện này" },
        { status: 404 }
      );
    }

    const topic = attempt.topic_id;
    const subject = topic?.subject_id;

    const detailedAnswers = (attempt.answers || []).map(
      (ans, index: number) => {
        const q = ans.question_id as IPopulatedQuestion | null;
        if (!q || !("_id" in q)) {
          return {
            index: index + 1,
            question_id: String(ans.question_id),
            content: "Câu hỏi không còn tồn tại trong hệ thống",
            difficulty_level: "medium",
            explanation: "",
            options: [],
            selected_option_id: ans.selected_option_id
              ? String(ans.selected_option_id)
              : null,
            is_correct: false,
          };
        }

        return {
          index: index + 1,
          question_id: String(q._id),
          content: q.content,
          difficulty_level: q.difficulty_level,
          explanation: q.explanation || "",
          options: (q.options || []).map((opt) => ({
            _id: String(opt._id),
            option_label: opt.option_label,
            content: opt.content,
            is_correct: Boolean(opt.is_correct),
          })),
          selected_option_id: ans.selected_option_id
            ? String(ans.selected_option_id)
            : null,
          is_correct: Boolean(ans.is_correct),
        };
      }
    );

    return NextResponse.json({
      success: true,
      attempt: {
        _id: String(attempt._id),
        practice_title:
          attempt.practice_title ||
          (topic?.topic_name ? `Ôn tập: ${topic.topic_name}` : "Tự luyện tổng hợp"),
        subject_name: subject?.subject_name || "Môn học chung",
        topic_name: topic?.topic_name || "Chuyên đề tự do",
        score: attempt.score || 0,
        total_correct: attempt.total_correct || 0,
        total_wrong: attempt.total_wrong || 0,
        total_questions: detailedAnswers.length,
        duration_seconds: attempt.duration_seconds || 0,
        submit_time: attempt.submit_time || attempt.createdAt,
        created_at: attempt.createdAt,
        answers: detailedAnswers,
      },
    });
  } catch (error) {
    console.error("Lỗi khi tải chi tiết bài tự luyện:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải chi tiết bài làm tự luyện" },
      { status: 500 }
    );
  }
}
