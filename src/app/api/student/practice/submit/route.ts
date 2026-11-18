import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExamAttempt, Question } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import mongoose from "mongoose";

interface IGradingOption {
  _id: mongoose.Types.ObjectId;
  option_label: string;
  content: string;
  is_correct: boolean;
}

interface IGradingQuestion {
  _id: mongoose.Types.ObjectId;
  options?: IGradingOption[];
}

/**
 * POST /api/student/practice/submit
 * Chấm điểm và nộp bài tự luyện, cập nhật điểm số, số câu đúng/sai và lưu lịch sử
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { attempt_id, duration_seconds = 0, answers = [] } = body;

    if (!attempt_id || typeof attempt_id !== "string") {
      return NextResponse.json(
        { success: false, message: "Mã phiên làm bài không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    const attempt = await ExamAttempt.findOne({
      _id: new mongoose.Types.ObjectId(attempt_id),
      user_id: new mongoose.Types.ObjectId(user.id),
    });

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phiên làm bài tương ứng" },
        { status: 404 }
      );
    }

    // Trích xuất danh sách question_id cần chấm
    const questionIds = answers
      .map((a: { question_id: string }) => a.question_id)
      .filter(Boolean);

    const questionsFromDb = (await Question.find({
      _id: { $in: questionIds },
    }).lean()) as unknown as IGradingQuestion[];

    const qMap = new Map<string, IGradingQuestion>();
    for (const q of questionsFromDb) {
      qMap.set(String(q._id), q);
    }

    let totalCorrect = 0;
    let totalWrong = 0;

    const gradedAnswers = answers.map(
      (ans: { question_id: string; selected_option_id: string | null }) => {
        const qData = qMap.get(String(ans.question_id));
        let isCorrect = false;

        if (qData && ans.selected_option_id) {
          const selectedOpt = (qData.options || []).find(
            (o) => String(o._id) === String(ans.selected_option_id)
          );
          if (selectedOpt && selectedOpt.is_correct) {
            isCorrect = true;
          }
        }

        if (isCorrect) {
          totalCorrect += 1;
        } else {
          totalWrong += 1;
        }

        return {
          question_id: new mongoose.Types.ObjectId(String(ans.question_id)),
          selected_option_id: ans.selected_option_id
            ? new mongoose.Types.ObjectId(String(ans.selected_option_id))
            : null,
          is_correct: isCorrect,
          answered_at: new Date(),
        };
      }
    );

    const totalQuestions = gradedAnswers.length || 1;
    // Tính điểm trên thang 10, làm tròn 1 chữ số thập phân
    const calculatedScore =
      Math.round(((totalCorrect / totalQuestions) * 10) * 10) / 10;

    attempt.status = "submitted";
    attempt.submit_time = new Date();
    attempt.duration_seconds = Math.max(0, Number(duration_seconds) || 0);
    attempt.score = calculatedScore;
    attempt.total_correct = totalCorrect;
    attempt.total_wrong = totalWrong;
    attempt.answers = gradedAnswers;

    await attempt.save();

    return NextResponse.json({
      success: true,
      message: "Nộp bài tự luyện thành công",
      attempt_id: String(attempt._id),
      score: calculatedScore,
      total_correct: totalCorrect,
      total_wrong: totalWrong,
      total_questions: totalQuestions,
      duration_seconds: attempt.duration_seconds,
    });
  } catch (error) {
    console.error("Lỗi khi nộp bài tự luyện:", error);
    return NextResponse.json(
      { success: false, message: "Không thể nộp bài tự luyện" },
      { status: 500 }
    );
  }
}
