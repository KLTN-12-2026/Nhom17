import { connectDB } from "@/lib/db";
import { Exam } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";

const examOptionSnapshotSchema = z.object({
  option_id: z.string().optional(),
  option_label: z.string().trim().min(1).max(5),
  content: z.string().trim().min(1),
  is_correct: z.boolean(),
});

const examQuestionSnapshotSchema = z.object({
  content: z.string().trim().min(3),
  difficulty_level: z.enum(["easy", "medium", "hard"]).default("medium"),
  explanation: z.string().optional().default(""),
  options: z.array(examOptionSnapshotSchema).min(2),
});

const examQuestionItemSchema = z.object({
  question_id: z.string().min(1, "Thiếu ID câu hỏi"),
  question_order: z.number().int().min(1).default(1),
  question_score: z.number().min(0).default(1),
  question_snapshot: examQuestionSnapshotSchema.optional(),
});

const createExamSchema = z.object({
  title: z.string().trim().min(3, "Tiêu đề đề thi phải có ít nhất 3 ký tự").max(255),
  subject_id: z.string().min(1, "Vui lòng chọn ngân hàng môn học cho đề thi"),
  duration_minutes: z.coerce.number().min(1, "Thời gian làm bài tối thiểu 1 phút").max(480),
  pass_score: z.coerce.number().min(0).default(5.0),
  max_score: z.coerce.number().min(0.1).default(10.0),
  shuffle_questions: z.boolean().default(true),
  shuffle_options: z.boolean().default(true),
  allow_view_result_immediately: z.boolean().default(true),
  is_published: z.boolean().default(false),
  questions: z.array(examQuestionItemSchema).min(1, "Đề thi phải có ít nhất 1 câu hỏi"),
});

/**
 * GET /api/instructor/exams
 * Lấy danh sách đề thi kèm bộ lọc và thống kê
 */
export async function GET(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const subjectId = searchParams.get("subject_id");
    const status = searchParams.get("status"); // "all" | "published" | "draft"

    const filter: Record<string, unknown> = {};

    // Giáo viên chỉ thấy đề thi do mình tạo (Admin thấy tất cả)
    if (user.role !== "admin") {
      filter.created_by = new mongoose.Types.ObjectId(user.id);
    }

    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      filter.subject_id = new mongoose.Types.ObjectId(subjectId);
    }

    if (status === "published") {
      filter.is_published = true;
    } else if (status === "draft") {
      filter.is_published = false;
    }

    if (search && search.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }

    const exams = await Exam.find(filter)
      .populate("subject_id", "subject_name code")
      .populate("created_by", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Thống kê nhanh
    const totalExams = exams.length;
    const publishedCount = exams.filter((e) => e.is_published).length;
    const draftCount = totalExams - publishedCount;

    return NextResponse.json({
      success: true,
      stats: {
        total: totalExams,
        published: publishedCount,
        draft: draftCount,
      },
      exams,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đề thi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải danh sách đề thi" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/instructor/exams
 * Tạo đề thi mới và chụp snapshot câu hỏi
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const body = await request.json();
    const parsed = createExamSchema.parse(body);

    if (!mongoose.Types.ObjectId.isValid(parsed.subject_id)) {
      return NextResponse.json(
        { success: false, message: "ID ngân hàng môn học không hợp lệ" },
        { status: 400 },
      );
    }

    // Chuẩn bị danh sách câu hỏi
    const formattedQuestions = parsed.questions.map((q, idx) => {
      const qObj: Record<string, unknown> = {
        question_id: new mongoose.Types.ObjectId(q.question_id),
        question_order: q.question_order || idx + 1,
        question_score: q.question_score || 1,
      };

      if (q.question_snapshot && q.question_snapshot.content) {
        qObj.question_snapshot = {
          content: q.question_snapshot.content,
          difficulty_level: q.question_snapshot.difficulty_level,
          explanation: q.question_snapshot.explanation || "",
          options: q.question_snapshot.options.map((opt) => ({
            option_id: opt.option_id && mongoose.Types.ObjectId.isValid(opt.option_id)
              ? new mongoose.Types.ObjectId(opt.option_id)
              : new mongoose.Types.ObjectId(),
            option_label: opt.option_label,
            content: opt.content,
            is_correct: opt.is_correct,
          })),
        };
      }

      return qObj;
    });

    const newExam = new Exam({
      title: parsed.title,
      subject_id: new mongoose.Types.ObjectId(parsed.subject_id),
      created_by: new mongoose.Types.ObjectId(user.id),
      duration_minutes: parsed.duration_minutes,
      pass_score: parsed.pass_score,
      max_score: parsed.max_score,
      shuffle_questions: parsed.shuffle_questions,
      shuffle_options: parsed.shuffle_options,
      allow_view_result_immediately: parsed.allow_view_result_immediately,
      is_published: parsed.is_published,
      questions: formattedQuestions,
    });

    await newExam.save();

    const populatedExam = await Exam.findById(newExam._id)
      .populate("subject_id", "subject_name code")
      .populate("created_by", "name email")
      .lean();

    return NextResponse.json({
      success: true,
      message: parsed.is_published
        ? "Đề thi đã được lưu và xuất bản thành công!"
        : "Đề thi đã được lưu dưới dạng bản nháp thành công!",
      exam: populatedExam,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || "Dữ liệu cấu hình đề thi không hợp lệ" },
        { status: 400 },
      );
    }

    console.error("Lỗi khi tạo đề thi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tạo đề thi. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}
