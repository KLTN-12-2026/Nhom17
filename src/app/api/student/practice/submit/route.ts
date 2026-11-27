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
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation?: string;
  options?: IGradingOption[];
}

interface IAttemptAnswerRef {
  question_id: mongoose.Types.ObjectId;
  selected_option_id?: mongoose.Types.ObjectId | null;
}

/**
 * Định dạng danh sách câu hỏi kèm đáp án đúng và lời giải chi tiết sau khi nộp bài
 */
function formatSubmittedQuestions(
  answers: IAttemptAnswerRef[],
  qMap: Map<string, IGradingQuestion>
) {
  return answers
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
}

/**
 * Tải map Question từ DB theo danh sách ObjectId
 */
async function loadQuestionsMap(
  questionIds: mongoose.Types.ObjectId[]
): Promise<Map<string, IGradingQuestion>> {
  const questionsFromDb = (await Question.find({
    _id: { $in: questionIds },
  }).lean()) as unknown as IGradingQuestion[];

  const qMap = new Map<string, IGradingQuestion>();
  for (const q of questionsFromDb) {
    qMap.set(String(q._id), q);
  }
  return qMap;
}

/**
 * POST /api/student/practice/submit
 * Chấm điểm và nộp bài tự luyện, cập nhật điểm số, số câu đúng/sai và trả đáp án + lời giải chi tiết
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

    if (
      !attempt_id ||
      typeof attempt_id !== "string" ||
      !mongoose.Types.ObjectId.isValid(attempt_id)
    ) {
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

    if (attempt.attempt_type === "official" || attempt.room_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể nộp bài thi phòng trực tuyến qua API tự luyện.",
        },
        { status: 403 }
      );
    }

    const existingAnswers = (attempt.answers || []) as IAttemptAnswerRef[];

    if (attempt.status !== "in_progress") {
      const qMap = await loadQuestionsMap(
        existingAnswers.map((a) => a.question_id)
      );
      return NextResponse.json({
        success: true,
        already_submitted: true,
        message: "Bài tự luyện này đã được nộp trước đó.",
        attempt_id: String(attempt._id),
        score: attempt.score || 0,
        total_correct: attempt.total_correct || 0,
        total_wrong: attempt.total_wrong || 0,
        total_questions: existingAnswers.length || 1,
        duration_seconds: attempt.duration_seconds || 0,
        questions: formatSubmittedQuestions(existingAnswers, qMap),
      });
    }

    // Ánh xạ lựa chọn của học sinh gửi lên theo question_id
    const selectedOptionMap = new Map<string, string | null>();
    if (Array.isArray(answers)) {
      for (const a of answers as Array<{
        question_id?: string;
        selected_option_id?: string | null;
      }>) {
        if (a?.question_id) {
          selectedOptionMap.set(
            String(a.question_id),
            a.selected_option_id ? String(a.selected_option_id) : null
          );
        }
      }
    }

    // Chấm dựa trên danh sách câu hỏi gốc của phiên thi để bảo toàn thứ tự & chống giả mạo
    const canonicalQuestionIds: mongoose.Types.ObjectId[] =
      existingAnswers.length > 0
        ? existingAnswers.map((a) => a.question_id)
        : Array.from(selectedOptionMap.keys())
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

    const qMap = await loadQuestionsMap(canonicalQuestionIds);

    let totalCorrect = 0;
    let totalWrong = 0;

    const gradedAnswers = canonicalQuestionIds.map(
      (qObjId: mongoose.Types.ObjectId) => {
        const qIdStr = String(qObjId);
        const selectedOptId = selectedOptionMap.get(qIdStr) ?? null;
        const qData = qMap.get(qIdStr);
        let isCorrect = false;

        if (qData && selectedOptId) {
          const selectedOpt = (qData.options || []).find(
            (o) => String(o._id) === selectedOptId
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
          question_id: qObjId,
          selected_option_id:
            selectedOptId && mongoose.Types.ObjectId.isValid(selectedOptId)
              ? new mongoose.Types.ObjectId(selectedOptId)
              : null,
          is_correct: isCorrect,
          answered_at: new Date(),
        };
      }
    );

    const totalQuestions = gradedAnswers.length || 1;
    // Tính điểm trên thang 10, làm tròn 1 chữ số thập phân
    const calculatedScore =
      Math.round((totalCorrect / totalQuestions) * 10 * 10) / 10;

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
      questions: formatSubmittedQuestions(gradedAnswers, qMap),
    });
  } catch (error) {
    console.error("Lỗi khi nộp bài tự luyện:", error);
    return NextResponse.json(
      { success: false, message: "Không thể nộp bài tự luyện" },
      { status: 500 }
    );
  }
}
