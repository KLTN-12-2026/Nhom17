import { connectDB } from "@/lib/db";
import { Question } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

interface IncomingQuestion {
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation?: string;
  topic_id?: string;
  is_ai_generated?: boolean;
  options: {
    option_label: string;
    content: string;
    is_correct: boolean;
  }[];
}

/**
 * POST /api/instructor/questions/batch
 * Lưu danh sách câu hỏi hàng loạt (từ AI hoặc từ File import) sau khi giáo viên xem trước
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { questions, topic_id, is_ai_generated: batchIsAi } = body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, message: "Danh sách câu hỏi cần lưu không được để trống" },
        { status: 400 }
      );
    }

    if (!topic_id) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn chủ đề cho các câu hỏi cần lưu" },
        { status: 400 }
      );
    }

    const validatedDocs = [];

    for (let i = 0; i < questions.length; i++) {
      const q: IncomingQuestion = questions[i];

      if (!q.content || !q.content.trim()) {
        return NextResponse.json(
          { success: false, message: `Câu hỏi số ${i + 1} chưa có nội dung đề bài` },
          { status: 400 }
        );
      }

      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
        return NextResponse.json(
          { success: false, message: `Câu hỏi số ${i + 1} phải có đúng 4 phương án lựa chọn (A, B, C, D)` },
          { status: 400 }
        );
      }

      const emptyOpt = q.options.some((opt) => !opt.content || !opt.content.trim());
      if (emptyOpt) {
        return NextResponse.json(
          { success: false, message: `Câu hỏi số ${i + 1} có phương án chưa nhập nội dung` },
          { status: 400 }
        );
      }

      const hasCorrect = q.options.some((opt) => opt.is_correct === true);
      if (!hasCorrect) {
        return NextResponse.json(
          { success: false, message: `Câu hỏi số ${i + 1} phải có ít nhất một đáp án đúng` },
          { status: 400 }
        );
      }

      const isAi = typeof q.is_ai_generated === "boolean" 
        ? q.is_ai_generated 
        : (typeof batchIsAi === "boolean" ? batchIsAi : false);

      validatedDocs.push({
        topic_id: q.topic_id || topic_id,
        created_by: user?.id,
        content: q.content.trim(),
        difficulty_level: ["easy", "medium", "hard"].includes(q.difficulty_level) ? q.difficulty_level : "medium",
        is_ai_generated: isAi,
        explanation: q.explanation?.trim() || "",
        options: q.options.map((opt, idx) => ({
          option_label: opt.option_label || ["A", "B", "C", "D"][idx],
          content: opt.content.trim(),
          is_correct: Boolean(opt.is_correct),
        })),
      });
    }

    await connectDB();

    const createdQuestions = await Question.insertMany(validatedDocs);

    return NextResponse.json({
      success: true,
      message: `Đã lưu thành công ${createdQuestions.length} câu hỏi vào ngân hàng!`,
      insertedCount: createdQuestions.length,
      questions: createdQuestions,
    });
  } catch (error) {
    console.error("Lỗi khi lưu câu hỏi hàng loạt:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi lưu câu hỏi vào ngân hàng" },
      { status: 500 }
    );
  }
}
