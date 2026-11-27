import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExamAttempt } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import {
  analyzeStudentAttempt,
  computeStudentTopicBreakdown,
  generateRuleBasedStudentDiagnosis,
  type IAnswerWithQuestion,
  type IStudentAiDiagnosisResult,
} from "@/lib/ai-analysis-service";
import mongoose from "mongoose";

/**
 * Xây dựng lại đối tượng kết quả từ cache MongoDB mà KHÔNG gọi lại Gemini API
 */
async function buildCachedAnalysisResponse(params: {
  score: number;
  max_score: number;
  total_correct: number;
  answers: IAnswerWithQuestion[];
  ai_analysis: {
    summary?: string;
    strengths?: string;
    weak_points?: string;
    ai_feedback?: string;
    action_items?: string[];
  };
}): Promise<IStudentAiDiagnosisResult> {
  const { score, max_score, total_correct, answers, ai_analysis } = params;
  const { topicBreakdown, recommendedTopics } =
    await computeStudentTopicBreakdown(answers);
  const norm10 =
    max_score > 0 ? Math.round(((score / max_score) * 10) * 10) / 10 : score;

  const fallback = generateRuleBasedStudentDiagnosis(
    score,
    max_score,
    norm10,
    total_correct,
    answers.length,
    topicBreakdown,
    recommendedTopics
  );

  return {
    summary: ai_analysis.summary?.trim() || fallback.summary,
    strengths: ai_analysis.strengths?.trim() || fallback.strengths,
    weak_points: ai_analysis.weak_points?.trim() || fallback.weak_points,
    ai_feedback: ai_analysis.ai_feedback?.trim() || fallback.ai_feedback,
    action_items:
      Array.isArray(ai_analysis.action_items) &&
      ai_analysis.action_items.length > 0
        ? ai_analysis.action_items
        : fallback.action_items,
    recommended_topics: recommendedTopics,
    topic_breakdown: topicBreakdown,
  };
}

/**
 * POST /api/student/practice/ai-analysis
 * Yêu cầu AI phân tích bài làm học viên để chỉ ra điểm mạnh, điểm yếu và gợi ý chủ đề ôn luyện
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
    const { attempt_id, force_refresh = false } = body;

    if (!attempt_id || !mongoose.Types.ObjectId.isValid(attempt_id)) {
      return NextResponse.json(
        { success: false, message: "Mã lượt làm bài không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    const query: Record<string, unknown> = {
      _id: new mongoose.Types.ObjectId(attempt_id),
    };
    if (user.role === "student") {
      query.user_id = new mongoose.Types.ObjectId(user.id);
    }

    const attempt = await ExamAttempt.findOne(query)
      .populate({
        path: "answers.question_id",
        select: "content difficulty_level explanation topic_id options",
        populate: {
          path: "topic_id",
          select: "topic_name level",
        },
      })
      .populate({
        path: "exam_id",
        select: "title pass_score max_score",
      });

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bài làm này" },
        { status: 404 }
      );
    }

    if (attempt.status !== "submitted" && attempt.status !== "timed_out") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bài làm chưa được nộp. Vui lòng hoàn thành và nộp bài trước khi phân tích.",
        },
        { status: 400 }
      );
    }

    if (!attempt.answers || attempt.answers.length < 3) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dữ liệu bài làm chưa đủ để mô hình AI phân tích chính xác (cần tối thiểu 3 câu hỏi).",
        },
        { status: 400 }
      );
    }

    const examMeta = attempt.exam_id as {
      title?: string;
      max_score?: number;
    } | null;
    const maxScore = examMeta?.max_score || 10;

    // Trả về cache ngay lập tức mà KHÔNG gọi lại Gemini API
    if (!force_refresh && attempt.ai_analysis?.weak_points) {
      const cachedResult = await buildCachedAnalysisResponse({
        score: attempt.score || 0,
        max_score: maxScore,
        total_correct: attempt.total_correct || 0,
        answers: attempt.answers,
        ai_analysis: attempt.ai_analysis,
      });

      return NextResponse.json({
        success: true,
        analysis: cachedResult,
        cached: true,
      });
    }

    const examTitle =
      examMeta?.title || attempt.practice_title || "Bài luyện tập";

    const analysisResult = await analyzeStudentAttempt({
      exam_title: examTitle,
      score: attempt.score || 0,
      max_score: maxScore,
      total_correct: attempt.total_correct || 0,
      total_wrong: attempt.total_wrong || 0,
      duration_seconds: attempt.duration_seconds || 0,
      answers: attempt.answers,
    });

    const validTopicIds = analysisResult.recommended_topics
      .map((t) => t.topic_id)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    attempt.ai_analysis = {
      summary: analysisResult.summary,
      strengths: analysisResult.strengths,
      weak_points: analysisResult.weak_points,
      ai_feedback: analysisResult.ai_feedback,
      action_items: analysisResult.action_items,
      recommended_topics: validTopicIds,
      created_at: new Date(),
    };

    await attempt.save();

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      cached: false,
    });
  } catch (error) {
    console.error("Lỗi khi phân tích kết quả bằng AI:", error);
    return NextResponse.json(
      { success: false, message: "Không thể thực hiện phân tích AI lúc này" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/student/practice/ai-analysis?attempt_id=...
 * Lấy nhanh phân tích AI của một lượt làm bài đã lưu (tuyệt đối không tự động gọi lại Gemini)
 */
export async function GET(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const attempt_id = searchParams.get("attempt_id");

    if (!attempt_id || !mongoose.Types.ObjectId.isValid(attempt_id)) {
      return NextResponse.json(
        { success: false, message: "Mã lượt làm bài không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    const query: Record<string, unknown> = {
      _id: new mongoose.Types.ObjectId(attempt_id),
    };
    if (user.role === "student") {
      query.user_id = new mongoose.Types.ObjectId(user.id);
    }

    const attempt = await ExamAttempt.findOne(query)
      .populate({
        path: "answers.question_id",
        select: "content difficulty_level explanation topic_id options",
        populate: {
          path: "topic_id",
          select: "topic_name level",
        },
      })
      .populate({
        path: "exam_id",
        select: "title pass_score max_score",
      });

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bài làm này" },
        { status: 404 }
      );
    }

    if (attempt.status !== "submitted" && attempt.status !== "timed_out") {
      return NextResponse.json({
        success: false,
        message: "Bài làm chưa hoàn thành.",
      });
    }

    if (!attempt.answers || attempt.answers.length < 3) {
      return NextResponse.json({
        success: false,
        message: "Chưa đủ dữ liệu làm bài để phân tích (cần tối thiểu 3 câu).",
      });
    }

    // Nếu chưa từng lưu kết quả AI -> trả về has_ai_analysis: false để UI hiện nút kích hoạt
    if (!attempt.ai_analysis?.weak_points) {
      return NextResponse.json({
        success: true,
        analysis: null,
        has_ai_analysis: false,
      });
    }

    const examMeta = attempt.exam_id as { max_score?: number } | null;
    const analysisResult = await buildCachedAnalysisResponse({
      score: attempt.score || 0,
      max_score: examMeta?.max_score || 10,
      total_correct: attempt.total_correct || 0,
      answers: attempt.answers,
      ai_analysis: attempt.ai_analysis,
    });

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      has_ai_analysis: true,
    });
  } catch (error) {
    console.error("Lỗi khi tải phân tích AI:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải phân tích AI" },
      { status: 500 }
    );
  }
}
