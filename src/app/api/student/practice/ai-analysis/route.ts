import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExamAttempt } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { analyzeStudentAttempt } from "@/lib/ai-analysis-service";
import mongoose from "mongoose";

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

    // Học viên chỉ được xem bài của chính mình, giáo viên và admin có thể xem bài của học viên
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

    // Điều kiện tiên quyết: Bài thi phải ở trạng thái submitted (đã nộp bài)
    if (attempt.status !== "submitted") {
      return NextResponse.json(
        {
          success: false,
          message: "Bài làm chưa được nộp. Vui lòng hoàn thành và nộp bài trước khi phân tích.",
        },
        { status: 400 }
      );
    }

    // Điều kiện ràng buộc: Dữ liệu làm bài phải đủ (tối thiểu 3 câu hỏi) để mô hình AI đánh giá chính xác
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

    // Caching check: Nếu đã có kết quả phân tích trong DB và không yêu cầu force_refresh
    if (!force_refresh && attempt.ai_analysis?.weak_points) {
      // Đã có phân tích trước đó, lấy và bổ sung thông tin topic_breakdown
      const cachedResult = await analyzeStudentAttempt({
        exam_title: attempt.practice_title || (attempt.exam_id as { title?: string })?.title || "Bài luyện tập",
        score: attempt.score || 0,
        total_correct: attempt.total_correct || 0,
        total_wrong: attempt.total_wrong || 0,
        duration_seconds: attempt.duration_seconds || 0,
        answers: attempt.answers,
      });

      // Ghi đè bằng nội dung đã cache nếu có
      cachedResult.weak_points = attempt.ai_analysis.weak_points;
      if (attempt.ai_analysis.ai_feedback) {
        cachedResult.ai_feedback = attempt.ai_analysis.ai_feedback;
      }

      return NextResponse.json({
        success: true,
        analysis: cachedResult,
        cached: true,
      });
    }

    // Lấy tiêu đề bài thi
    let examTitle = attempt.practice_title || "Bài luyện tập";
    if (attempt.exam_id && typeof attempt.exam_id === "object" && "title" in attempt.exam_id) {
      examTitle = (attempt.exam_id as { title: string }).title;
    }

    // Chạy phân tích AI thông minh
    const analysisResult = await analyzeStudentAttempt({
      exam_title: examTitle,
      score: attempt.score || 0,
      total_correct: attempt.total_correct || 0,
      total_wrong: attempt.total_wrong || 0,
      duration_seconds: attempt.duration_seconds || 0,
      answers: attempt.answers,
    });

    // Lưu kết quả vào DB để cache
    const validTopicIds = analysisResult.recommended_topics
      .map((t) => t.topic_id)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    attempt.ai_analysis = {
      weak_points: analysisResult.weak_points,
      ai_feedback: analysisResult.ai_feedback,
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
 * Lấy nhanh phân tích AI của một lượt làm bài đã lưu
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

    if (!attempt.answers || attempt.answers.length < 3) {
      return NextResponse.json({
        success: false,
        message: "Chưa đủ dữ liệu làm bài để phân tích (cần tối thiểu 3 câu).",
      });
    }

    const analysisResult = await analyzeStudentAttempt({
      exam_title: attempt.practice_title || (attempt.exam_id as { title?: string })?.title || "Bài luyện tập",
      score: attempt.score || 0,
      total_correct: attempt.total_correct || 0,
      total_wrong: attempt.total_wrong || 0,
      duration_seconds: attempt.duration_seconds || 0,
      answers: attempt.answers,
    });

    if (attempt.ai_analysis?.weak_points) {
      analysisResult.weak_points = attempt.ai_analysis.weak_points;
    }
    if (attempt.ai_analysis?.ai_feedback) {
      analysisResult.ai_feedback = attempt.ai_analysis.ai_feedback;
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      has_ai_analysis: !!attempt.ai_analysis?.weak_points,
    });
  } catch (error) {
    console.error("Lỗi khi tải phân tích AI:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải phân tích AI" },
      { status: 500 }
    );
  }
}
