import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import {
  deleteRoadmapFile,
  RoadmapUploadError,
  saveRoadmapFile,
} from "@/lib/roadmap-files";
import { Exam, Question, Subject, Topic } from "@/models";

export const runtime = "nodejs";

const questionSchema = z
  .object({
    content: z.string().trim().min(1).max(10000),
    difficulty_level: z.enum(["easy", "medium", "hard"]),
    explanation: z.string().trim().max(10000).optional().default(""),
    options: z
      .array(
        z.object({
          option_label: z.string().trim().min(1).max(5),
          content: z.string().trim().min(1).max(5000),
          is_correct: z.boolean(),
        }),
      )
      .length(4),
  })
  .refine(
    (question) =>
      question.options.filter((option) => option.is_correct).length === 1,
    {
      message: "Mỗi câu hỏi phải có đúng một đáp án đúng.",
    },
  );

const importSchema = z.object({
  mode: z.enum(["practice", "exam"]),
  subject_id: z.string().refine(mongoose.Types.ObjectId.isValid),
  topic_id: z.string().refine(mongoose.Types.ObjectId.isValid),
  exam_title: z.string().trim().max(255).optional().default(""),
  duration_minutes: z.coerce.number().int().min(1).max(480).default(45),
  questions: z.array(questionSchema).min(1).max(100),
});

export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  let uploadedUrl = "";
  let createdQuestionIds: mongoose.Types.ObjectId[] = [];
  let createdExamId: mongoose.Types.ObjectId | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rawQuestions = formData.get("questions");
    const rawInput = {
      mode: formData.get("mode"),
      subject_id: formData.get("subject_id"),
      topic_id: formData.get("topic_id"),
      exam_title: formData.get("exam_title") || "",
      duration_minutes: formData.get("duration_minutes") || 45,
      questions:
        typeof rawQuestions === "string" ? JSON.parse(rawQuestions) : null,
    };
    const parsed = importSchema.safeParse(rawInput);
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn tệp câu hỏi." },
        { status: 400 },
      );
    }
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            parsed.error.issues[0]?.message ||
            "Thông tin import câu hỏi không hợp lệ.",
        },
        { status: 400 },
      );
    }
    if (parsed.data.mode === "exam" && parsed.data.exam_title.length < 3) {
      return NextResponse.json(
        { success: false, message: "Tên đề thi cần ít nhất 3 ký tự." },
        { status: 400 },
      );
    }

    await connectDB();
    const [subject, topic] = await Promise.all([
      Subject.findById(parsed.data.subject_id).select("_id"),
      Topic.findOne({
        _id: parsed.data.topic_id,
        subject_id: parsed.data.subject_id,
      }).select("_id"),
    ]);
    if (!subject || !topic) {
      return NextResponse.json(
        { success: false, message: "Môn học hoặc chuyên đề đã chọn không hợp lệ." },
        { status: 400 },
      );
    }

    const uploaded = await saveRoadmapFile(file, "assessment");
    uploadedUrl = uploaded.url;
    const createdQuestions = await Question.insertMany(
      parsed.data.questions.map((question) => ({
        topic_id: new mongoose.Types.ObjectId(parsed.data.topic_id),
        created_by: new mongoose.Types.ObjectId(user.id),
        content: question.content,
        difficulty_level: question.difficulty_level,
        explanation: question.explanation,
        is_ai_generated: false,
        options: question.options,
      })),
    );
    createdQuestionIds = createdQuestions.map((question) => question._id);

    if (parsed.data.mode === "exam") {
      const exam = await Exam.create({
        title: parsed.data.exam_title,
        subject_id: new mongoose.Types.ObjectId(parsed.data.subject_id),
        subject_ids: [new mongoose.Types.ObjectId(parsed.data.subject_id)],
        created_by: new mongoose.Types.ObjectId(user.id),
        duration_minutes: parsed.data.duration_minutes,
        pass_score: 5,
        max_score: 10,
        shuffle_questions: true,
        shuffle_options: true,
        allow_view_result_immediately: true,
        is_published: true,
        questions: createdQuestions.map((question, index) => ({
          question_id: question._id,
          question_order: index + 1,
          question_score: 10 / createdQuestions.length,
          question_snapshot: {
            content: question.content,
            difficulty_level: question.difficulty_level,
            explanation: question.explanation || "",
            options: question.options.map((option: {
              _id: mongoose.Types.ObjectId;
              option_label: string;
              content: string;
              is_correct: boolean;
            }) => ({
              option_id: option._id,
              option_label: option.option_label,
              content: option.content,
              is_correct: option.is_correct,
            })),
          },
        })),
      });
      createdExamId = exam._id;
      return NextResponse.json({
        success: true,
        mode: parsed.data.mode,
        exam_id: String(exam._id),
        title: exam.title,
        inserted_count: createdQuestions.length,
        resource_url: uploaded.url,
        file_name: uploaded.file_name,
      });
    }

    return NextResponse.json({
      success: true,
      mode: parsed.data.mode,
      topic_id: parsed.data.topic_id,
      inserted_count: createdQuestions.length,
      resource_url: uploaded.url,
      file_name: uploaded.file_name,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Danh sách câu hỏi không phải JSON hợp lệ." },
        { status: 400 },
      );
    }

    if (createdExamId) {
      try {
        await Exam.deleteOne({ _id: createdExamId, created_by: user.id });
      } catch (cleanupError) {
        console.error("Không thể hoàn tác đề thi sau lỗi import:", cleanupError);
      }
    }
    if (createdQuestionIds.length) {
      try {
        await Question.deleteMany({
          _id: { $in: createdQuestionIds },
          created_by: user.id,
        });
      } catch (cleanupError) {
        console.error("Không thể hoàn tác câu hỏi sau lỗi import:", cleanupError);
      }
    }
    if (uploadedUrl) {
      try {
        await deleteRoadmapFile(uploadedUrl);
      } catch (cleanupError) {
        console.error("Không thể xóa tệp sau lỗi import:", cleanupError);
      }
    }

    if (error instanceof RoadmapUploadError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }
    console.error("Lỗi khi nhập file vào lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể nhập câu hỏi từ tệp." },
      { status: 500 },
    );
  }
}
