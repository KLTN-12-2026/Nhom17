import { connectDB } from "@/lib/db";
import { Question, Topic, Subject } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const optionSchema = z.object({
  option_label: z.string().trim().min(1).max(5),
  content: z.string().trim().min(1, "Nội dung đáp án không được để trống"),
  is_correct: z.boolean(),
});

const createQuestionSchema = z.object({
  topic_id: z.string().min(1, "Vui lòng chọn chủ đề"),
  content: z.string().trim().min(5, "Nội dung câu hỏi phải có ít nhất 5 ký tự"),
  difficulty_level: z.enum(["easy", "medium", "hard"]).default("medium"),
  is_ai_generated: z.boolean().default(false),
  explanation: z.string().trim().optional().default(""),
  options: z.array(optionSchema).length(4, "Mỗi câu hỏi bắt buộc phải có đúng 4 phương án lựa chọn (A, B, C, D)"),
});

/**
 * GET /api/instructor/questions
 * Lấy danh sách câu hỏi kèm bộ lọc (chủ đề, môn học, độ khó, tìm kiếm từ khóa)
 */
export async function GET(request: Request) {
  const { errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topic_id");
  const subjectId = searchParams.get("subject_id");
  const difficulty = searchParams.get("difficulty");
  const isAi = searchParams.get("is_ai_generated");
  const search = searchParams.get("search");

  // Xây dựng query filter
  const filter: Record<string, unknown> = {};

  if (difficulty && ["easy", "medium", "hard"].includes(difficulty)) {
    filter.difficulty_level = difficulty;
  }

  if (isAi !== null && isAi !== undefined && isAi !== "") {
    filter.is_ai_generated = isAi === "true";
  }

  if (topicId) {
    filter.topic_id = topicId;
  } else if (subjectId) {
    // Nếu lọc theo môn học, tìm tất cả topic thuộc môn học đó
    const topics = await Topic.find({ subject_id: subjectId }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);
    filter.topic_id = { $in: topicIds };
  }

  if (search && search.trim()) {
    filter.content = { $regex: search.trim(), $options: "i" };
  }

  const questions = await Question.find(filter)
    .populate({
      path: "topic_id",
      select: "topic_name subject_id level",
      populate: {
        path: "subject_id",
        select: "subject_name",
        model: Subject,
      },
      model: Topic,
    })
    .populate("created_by", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    total: questions.length,
    questions,
  });
}

/**
 * POST /api/instructor/questions
 * Thêm một câu hỏi trắc nghiệm mới vào ngân hàng câu hỏi
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const validatedData = createQuestionSchema.parse(body);

    // Kiểm tra xem có ít nhất 1 đáp án đúng không
    const hasCorrectOption = validatedData.options.some((opt) => opt.is_correct);
    if (!hasCorrectOption) {
      return NextResponse.json(
        { success: false, message: "Phải có ít nhất một phương án là đáp án đúng" },
        { status: 400 }
      );
    }

    await connectDB();

    const newQuestion = await Question.create({
      ...validatedData,
      created_by: user?.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tạo câu hỏi thành công!",
        question: newQuestion,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? "Dữ liệu câu hỏi không hợp lệ" },
        { status: 400 }
      );
    }

    console.error("Lỗi tạo câu hỏi:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi lưu câu hỏi" },
      { status: 500 }
    );
  }
}
