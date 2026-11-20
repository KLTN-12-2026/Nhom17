import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExamAttempt } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import mongoose from "mongoose";
import type { IExamQuestion } from "@/models/Exam";
import { resolveExamQuestions } from "@/lib/exam-grading";

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
  allow_view_result_immediately?: boolean;
  subject_id?: IPopulatedSubject | null;
  questions?: IExamQuestion[];
}

interface IPopulatedRoom {
  _id: mongoose.Types.ObjectId;
  room_code: string;
  status: "waiting" | "in_progress" | "finished";
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
  attempt_type?: "practice" | "official";
  topic_id?: IPopulatedTopic | null;
  exam_id?: IPopulatedExam | null;
  room_id?: IPopulatedRoom | null;
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
 * Xem lại chi tiết một bài làm cũ (hỗ trợ cả Tự luyện và Thi phòng trực tuyến).
 * Chỉ trả đáp án chi tiết của bài thi phòng khi phòng thi đã kết thúc và đề cho phép xem đáp án.
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
        { success: false, message: "Mã lượt làm bài không hợp lệ" },
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
        path: "exam_id",
        select: "title max_score allow_view_result_immediately subject_id questions",
        populate: {
          path: "subject_id",
          select: "subject_name",
        },
      })
      .populate({
        path: "room_id",
        select: "room_code status",
      })
      .populate({
        path: "answers.question_id",
        select: "content difficulty_level explanation options",
      })
      .lean()) as IAttemptDetailLeanDoc | null;

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bài làm này" },
        { status: 404 }
      );
    }

    const topic = attempt.topic_id;
    const exam = attempt.exam_id;
    const room = attempt.room_id;
    const subject = topic?.subject_id || exam?.subject_id;
    const isOfficial = attempt.attempt_type === "official" || Boolean(exam);

    const allowExamReview = exam?.allow_view_result_immediately !== false;
    const waitingRoomFinish =
      isOfficial &&
      allowExamReview &&
      Boolean(room && room.status !== "finished");

    const canViewDetails =
      !isOfficial || (allowExamReview && (!room || room.status === "finished"));

    // Nếu được phép xem và là bài thi phòng -> ưu tiên snapshot từ Exam.questions
    let snapshotMap: Map<
      string,
      {
        content: string;
        difficulty_level: string;
        explanation: string;
        options: Array<{
          _id: string;
          option_label: string;
          content: string;
          is_correct: boolean;
        }>;
      }
    > | null = null;

    if (
      canViewDetails &&
      exam &&
      Array.isArray(exam.questions) &&
      exam.questions.length > 0
    ) {
      const resolved = await resolveExamQuestions({ questions: exam.questions });
      snapshotMap = new Map(
        resolved.map((q) => [
          q.question_id,
          {
            content: q.content,
            difficulty_level: q.difficulty_level,
            explanation: q.explanation,
            options: q.options,
          },
        ])
      );
    }

    const detailedAnswers = canViewDetails
      ? (attempt.answers || []).map((ans, index: number) => {
          const rawQ = ans.question_id;
          const qIdStr =
            rawQ && typeof rawQ === "object" && "_id" in rawQ
              ? String(rawQ._id)
              : String(rawQ || "");

          const snap = snapshotMap?.get(qIdStr);
          if (snap) {
            return {
              index: index + 1,
              question_id: qIdStr,
              content: snap.content,
              difficulty_level: snap.difficulty_level,
              explanation: snap.explanation,
              options: snap.options,
              selected_option_id: ans.selected_option_id
                ? String(ans.selected_option_id)
                : null,
              is_correct: Boolean(ans.is_correct),
            };
          }

          const q = rawQ as IPopulatedQuestion | null;
          if (!q || !("_id" in q)) {
            return {
              index: index + 1,
              question_id: qIdStr,
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
        })
      : [];

    return NextResponse.json({
      success: true,
      attempt: {
        _id: String(attempt._id),
        attempt_type: isOfficial ? "official" : "practice",
        room_code: room?.room_code || null,
        can_view_details: canViewDetails,
        waiting_room_finish: waitingRoomFinish,
        practice_title:
          attempt.practice_title ||
          exam?.title ||
          (topic?.topic_name ? `Ôn tập: ${topic.topic_name}` : "Tự luyện tổng hợp"),
        subject_name: subject?.subject_name || "Môn học chung",
        topic_name:
          topic?.topic_name ||
          (room?.room_code ? `Phòng thi ${room.room_code}` : "Đề thi chính thức"),
        score: attempt.score || 0,
        max_score: exam?.max_score || 10,
        total_correct: attempt.total_correct || 0,
        total_wrong: attempt.total_wrong || 0,
        total_questions: (attempt.answers || []).length,
        duration_seconds: attempt.duration_seconds || 0,
        submit_time: attempt.submit_time || attempt.createdAt,
        created_at: attempt.createdAt,
        answers: detailedAnswers,
      },
    });
  } catch (error) {
    console.error("Lỗi khi tải chi tiết bài làm:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải chi tiết bài làm" },
      { status: 500 }
    );
  }
}
