import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Exam, ExamAttempt } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { analyzeClassExamAttempts } from "@/lib/ai-analysis-service";
import mongoose from "mongoose";

/**
 * GET /api/instructor/exams/[id]/ai-analytics
 * Cung cấp cho giáo viên báo cáo chẩn đoán AI tổng quan về những phần kiến thức nhiều học sinh bị sai
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Mã đề thi không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    // Kiểm tra quyền sở hữu đề thi (giáo viên tạo đề hoặc admin)
    const examQuery: Record<string, unknown> = {
      _id: new mongoose.Types.ObjectId(id),
    };
    if (user.role === "instructor") {
      examQuery.created_by = new mongoose.Types.ObjectId(user.id);
    }

    const exam = await Exam.findOne(examQuery).lean();
    if (!exam) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đề thi hoặc bạn không có quyền truy cập" },
        { status: 404 }
      );
    }

    // Lấy tất cả bài thi đã nộp của đề thi này
    const attempts = await ExamAttempt.find({
      exam_id: new mongoose.Types.ObjectId(id),
      status: "submitted",
    })
      .populate({
        path: "answers.question_id",
        select: "content difficulty_level topic_id options",
        populate: {
          path: "topic_id",
          select: "topic_name level",
        },
      })
      .select("user_id score total_correct total_wrong answers duration_seconds submit_time")
      .lean();

    // Điều kiện ràng buộc: Nếu chưa có bài làm nào nộp
    if (attempts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Chưa có học sinh nào nộp bài thi này để phân tích.",
        analytics: {
          class_summary: {
            total_candidates: 0,
            average_score: 0,
            highest_score: 0,
            lowest_score: 0,
            pass_rate: 0,
          },
          topic_diagnostics: [],
          top_failed_questions: [],
          ai_pedagogical_report: {
            general_assessment: "Chưa có dữ liệu bài làm của thí sinh.",
            common_misconceptions: "Cần tối thiểu 1 học sinh hoàn thành bài thi để AI bắt đầu phân tích.",
            remedial_strategies: ["Chia sẻ đề thi hoặc mã phòng thi cho học sinh làm bài."],
            focus_topics_for_next_class: [],
          },
        },
      });
    }

    // Gọi AI engine phân tích chẩn đoán lớp học
    const analytics = await analyzeClassExamAttempts({
      exam_title: exam.title,
      pass_score: exam.pass_score || 5.0,
      max_score: exam.max_score || 10.0,
      attempts: attempts as unknown as {
        user_id: unknown;
        score: number;
        total_correct: number;
        total_wrong: number;
        answers: import("@/lib/ai-analysis-service").IAnswerWithQuestion[];
      }[],
    });

    return NextResponse.json({
      success: true,
      exam: {
        _id: String(exam._id),
        title: exam.title,
        duration_minutes: exam.duration_minutes,
        total_questions: exam.total_questions,
        pass_score: exam.pass_score,
        max_score: exam.max_score,
      },
      analytics,
    });
  } catch (error) {
    console.error("Lỗi khi tạo báo cáo chẩn đoán AI cho giáo viên:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải báo cáo AI của đề thi" },
      { status: 500 }
    );
  }
}
