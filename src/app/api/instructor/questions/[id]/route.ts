import { connectDB } from "@/lib/db";
import { Question } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/instructor/questions/[id]
 * Sửa câu hỏi: Cập nhật nội dung, đáp án, mức độ khó, giải thích
 */
export async function PUT(request: Request, context: RouteParams) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { topic_id, content, difficulty_level, is_ai_generated, explanation, options } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { success: false, message: "Nội dung câu hỏi không được để trống" },
        { status: 400 }
      );
    }

    if (!options || !Array.isArray(options) || options.length !== 4) {
      return NextResponse.json(
        { success: false, message: "Mỗi câu hỏi bắt buộc phải có đúng 4 phương án lựa chọn (A, B, C, D)" },
        { status: 400 }
      );
    }

    const hasEmptyOption = options.some(
      (opt: { content?: string }) => !opt.content || !opt.content.trim()
    );
    if (hasEmptyOption) {
      return NextResponse.json(
        { success: false, message: "Tất cả 4 phương án lựa chọn đều phải có nội dung" },
        { status: 400 }
      );
    }

    const hasCorrectAnswer = options.some((opt: { is_correct?: boolean }) => opt.is_correct === true);
    if (!hasCorrectAnswer) {
      return NextResponse.json(
        { success: false, message: "Bắt buộc phải có ít nhất một đáp án đúng" },
        { status: 400 }
      );
    }

    await connectDB();

    const existingQuestion = await Question.findById(id);
    if (!existingQuestion) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy câu hỏi để cập nhật" },
        { status: 404 }
      );
    }

    if (
      user?.role !== "admin" &&
      existingQuestion.created_by &&
      existingQuestion.created_by.toString() !== user?.id
    ) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền chỉnh sửa câu hỏi này vì nó được tạo bởi giáo viên khác." },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {
      content: content.trim(),
      difficulty_level: ["easy", "medium", "hard"].includes(difficulty_level) ? difficulty_level : "medium",
      explanation: explanation?.trim() || "",
      options: options.map((opt: { option_label?: string; content: string; is_correct?: boolean }, idx: number) => ({
        option_label: opt.option_label || ["A", "B", "C", "D"][idx] || `Lựa chọn ${idx + 1}`,
        content: opt.content.trim(),
        is_correct: Boolean(opt.is_correct),
      })),
    };

    if (topic_id) {
      updateData.topic_id = topic_id;
    }

    if (typeof is_ai_generated === "boolean") {
      updateData.is_ai_generated = is_ai_generated;
    }

    const updatedQuestion = await Question.findByIdAndUpdate(id, updateData, { new: true })
      .populate("topic_id", "topic_name subject_id")
      .populate("created_by", "name email");

    return NextResponse.json({
      success: true,
      message: "Cập nhật câu hỏi thành công",
      question: updatedQuestion,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật câu hỏi:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi cập nhật câu hỏi" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/instructor/questions/[id]
 * Xóa một câu hỏi khỏi ngân hàng câu hỏi kèm kiểm tra quyền sở hữu
 */
export async function DELETE(request: Request, context: RouteParams) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  try {
    await connectDB();

    const question = await Question.findById(id);
    if (!question) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy câu hỏi để xóa" },
        { status: 404 }
      );
    }

    if (
      user?.role !== "admin" &&
      question.created_by &&
      question.created_by.toString() !== user?.id
    ) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền xóa câu hỏi này vì nó được tạo bởi giáo viên khác." },
        { status: 403 }
      );
    }

    await Question.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Đã xóa câu hỏi khỏi ngân hàng thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa câu hỏi:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi xóa câu hỏi" },
      { status: 500 }
    );
  }
}

