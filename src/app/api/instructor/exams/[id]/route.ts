import { connectDB } from "@/lib/db";
import { Exam, ExamAttempt, ExamRoom } from "@/models";
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
  question_id: z.string().min(1),
  question_order: z.number().int().min(1).default(1),
  question_score: z.number().min(0).default(1),
  question_snapshot: examQuestionSnapshotSchema.optional(),
});

const updateExamSchema = z.object({
  title: z.string().trim().min(3, "Tiêu đề đề thi phải có ít nhất 3 ký tự").max(255).optional(),
  subject_id: z.string().min(1, "Vui lòng chọn ngân hàng môn học").optional(),
  duration_minutes: z.coerce.number().min(1, "Thời gian làm bài tối thiểu 1 phút").max(480).optional(),
  pass_score: z.coerce.number().min(0).optional(),
  max_score: z.coerce.number().min(0.1).optional(),
  shuffle_questions: z.boolean().optional(),
  shuffle_options: z.boolean().optional(),
  allow_view_result_immediately: z.boolean().optional(),
  is_published: z.boolean().optional(),
  questions: z.array(examQuestionItemSchema).min(1, "Đề thi phải có ít nhất 1 câu hỏi").optional(),
});

/**
 * GET /api/instructor/exams/[id]
 * Lấy chi tiết đề thi
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "ID đề thi không hợp lệ" }, { status: 400 });
    }

    await connectDB();
    const exam = await Exam.findById(id)
      .populate("subject_id", "subject_name code")
      .populate("created_by", "name email")
      .lean();

    if (!exam) {
      return NextResponse.json({ success: false, message: "Không tìm thấy đề thi" }, { status: 404 });
    }

    // Kiểm tra quyền: Giáo viên chỉ xem đề của mình (hoặc admin)
    if (user.role !== "admin" && String(exam.created_by._id || exam.created_by) !== user.id) {
      return NextResponse.json({ success: false, message: "Bạn không có quyền truy cập đề thi này" }, { status: 403 });
    }

    // Đếm số lượt thi đã thực hiện trên đề này
    const attemptCount = await ExamAttempt.countDocuments({ exam_id: id });

    return NextResponse.json({
      success: true,
      exam,
      attempt_count: attemptCount,
    });
  } catch (error) {
    console.error("Lỗi khi tải chi tiết đề thi:", error);
    return NextResponse.json({ success: false, message: "Lỗi máy chủ khi tải đề thi" }, { status: 500 });
  }
}

/**
 * PUT /api/instructor/exams/[id]
 * Cập nhật cấu hình và danh sách câu hỏi của đề thi
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "ID đề thi không hợp lệ" }, { status: 400 });
    }

    await connectDB();
    const existingExam = await Exam.findById(id);
    if (!existingExam) {
      return NextResponse.json({ success: false, message: "Không tìm thấy đề thi cần cập nhật" }, { status: 404 });
    }

    if (user.role !== "admin" && String(existingExam.created_by) !== user.id) {
      return NextResponse.json({ success: false, message: "Bạn không có quyền chỉnh sửa đề thi này" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateExamSchema.parse(body);

    if (parsed.title !== undefined) existingExam.title = parsed.title;
    if (parsed.subject_id !== undefined && mongoose.Types.ObjectId.isValid(parsed.subject_id)) {
      existingExam.subject_id = new mongoose.Types.ObjectId(parsed.subject_id);
    }
    if (parsed.duration_minutes !== undefined) existingExam.duration_minutes = parsed.duration_minutes;
    if (parsed.pass_score !== undefined) existingExam.pass_score = parsed.pass_score;
    if (parsed.max_score !== undefined) existingExam.max_score = parsed.max_score;
    if (parsed.shuffle_questions !== undefined) existingExam.shuffle_questions = parsed.shuffle_questions;
    if (parsed.shuffle_options !== undefined) existingExam.shuffle_options = parsed.shuffle_options;
    if (parsed.allow_view_result_immediately !== undefined) {
      existingExam.allow_view_result_immediately = parsed.allow_view_result_immediately;
    }
    if (parsed.is_published !== undefined) existingExam.is_published = parsed.is_published;

    if (parsed.questions) {
      existingExam.questions = parsed.questions.map((q, idx) => {
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
      }) as unknown as typeof existingExam.questions;
    }

    await existingExam.save();

    const updated = await Exam.findById(id)
      .populate("subject_id", "subject_name code")
      .populate("created_by", "name email")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Cập nhật đề thi thành công!",
      exam: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }
    console.error("Lỗi khi cập nhật đề thi:", error);
    return NextResponse.json({ success: false, message: "Không thể cập nhật đề thi" }, { status: 500 });
  }
}

/**
 * DELETE /api/instructor/exams/[id]
 * Xóa đề thi
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "ID đề thi không hợp lệ" }, { status: 400 });
    }

    await connectDB();
    const exam = await Exam.findById(id);
    if (!exam) {
      return NextResponse.json({ success: false, message: "Không tìm thấy đề thi" }, { status: 404 });
    }

    if (user.role !== "admin" && String(exam.created_by) !== user.id) {
      return NextResponse.json({ success: false, message: "Bạn không có quyền xóa đề thi này" }, { status: 403 });
    }

    // Kiểm tra xem đề thi đã có lượt thi chưa
    const attemptCount = await ExamAttempt.countDocuments({ exam_id: id });
    if (attemptCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Không thể xóa đề thi này vì đã có ${attemptCount} lượt thí sinh làm bài. Bạn có thể chuyển đề sang trạng thái "Bản nháp" để ngừng cho thi.`,
        },
        { status: 400 },
      );
    }

    // Xóa liên kết trong ExamRoom nếu có
    await ExamRoom.deleteMany({ exam_id: id });
    await Exam.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Đã xóa đề thi thành công!",
    });
  } catch (error) {
    console.error("Lỗi khi xóa đề thi:", error);
    return NextResponse.json({ success: false, message: "Không thể xóa đề thi" }, { status: 500 });
  }
}
