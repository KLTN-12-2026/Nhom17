import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { getAccessibleRoadmapExam } from "@/lib/student-roadmap-exam";
import { ExamAttempt } from "@/models";
import type { IExamQuestion } from "@/models/Exam";

type RouteContext = {
  params: Promise<{ id: string; examId: string }>;
};

const submitSchema = z.object({
  attempt_id: z.string().refine(mongoose.Types.ObjectId.isValid),
  answers: z
    .array(
      z.object({
        question_id: z.string().refine(mongoose.Types.ObjectId.isValid),
        selected_option_id: z
          .string()
          .refine(mongoose.Types.ObjectId.isValid)
          .nullable(),
      }),
    )
    .max(100),
});

export async function POST(request: Request, { params }: RouteContext) {
  const { user, errorResponse } = await checkApiAuthorization(["student"]);
  if (errorResponse) return errorResponse;

  try {
    const { id, examId } = await params;
    const body: unknown = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || "Thông tin nộp bài không hợp lệ.",
        },
        { status: 400 },
      );
    }

    await connectDB();
    const access = await getAccessibleRoadmapExam(id, examId, user.id);
    if ("error" in access && access.error) {
      return NextResponse.json(
        { success: false, message: access.error.message },
        { status: access.error.status },
      );
    }

    const attempt = await ExamAttempt.findOne({
      _id: parsed.data.attempt_id,
      user_id: user.id,
      exam_id: examId,
      attempt_type: "official",
    });
    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lượt làm đề thi." },
        { status: 404 },
      );
    }
    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        { success: false, message: "Lượt làm đề thi này đã được nộp." },
        { status: 409 },
      );
    }

    const questions = new Map<string, IExamQuestion>(
      access.exam.questions.map((question: IExamQuestion) => [
        String(question.question_id),
        question,
      ]),
    );
    const submittedAnswers = new Map<string, string | null>();
    for (const answer of parsed.data.answers) {
      if (
        submittedAnswers.has(answer.question_id) ||
        !questions.has(answer.question_id)
      ) {
        return NextResponse.json(
          { success: false, message: "Danh sách câu trả lời không khớp đề thi." },
          { status: 400 },
        );
      }
      submittedAnswers.set(answer.question_id, answer.selected_option_id);
    }

    if (questions.size === 0) {
      return NextResponse.json(
        { success: false, message: "Đề thi chưa có câu hỏi để chấm." },
        { status: 409 },
      );
    }

    for (const [questionId, selectedOptionId] of submittedAnswers) {
      if (
        selectedOptionId &&
        !questions
          .get(questionId)
          ?.question_snapshot?.options.some(
            (option) => String(option.option_id) === selectedOptionId,
          )
      ) {
        return NextResponse.json(
          { success: false, message: "Một câu trả lời không thuộc đề thi." },
          { status: 400 },
        );
      }
    }

    let totalCorrect = 0;
    const gradedAnswers = [...questions.entries()].map(
      ([questionId, question]) => {
        const selectedOptionId = submittedAnswers.get(questionId) || null;
        const options = question.question_snapshot?.options || [];
        const selectedOption = selectedOptionId
          ? options.find(
                (option) => String(option.option_id) === selectedOptionId,
            )
          : null;
        const isCorrect = Boolean(selectedOption?.is_correct);
        if (isCorrect) totalCorrect += 1;
        return {
          question_id: new mongoose.Types.ObjectId(questionId),
          selected_option_id: selectedOptionId
            ? new mongoose.Types.ObjectId(selectedOptionId)
            : null,
          is_correct: isCorrect,
          answered_at: new Date(),
        };
      },
    );

    const totalQuestions = gradedAnswers.length;
    const score =
      Math.round((totalCorrect / totalQuestions) * 10 * 10) / 10;
    const durationSeconds = Math.max(
      0,
      Math.floor((Date.now() - attempt.start_time.getTime()) / 1000),
    );
    const timedOut =
      durationSeconds > access.exam.duration_minutes * 60;

    attempt.answers = gradedAnswers;
    attempt.total_correct = totalCorrect;
    attempt.total_wrong = totalQuestions - totalCorrect;
    attempt.score = score;
    attempt.duration_seconds = durationSeconds;
    attempt.submit_time = new Date();
    attempt.status = timedOut ? "timed_out" : "submitted";
    await attempt.save();

    return NextResponse.json({
      success: true,
      score,
      total_correct: totalCorrect,
      total_wrong: totalQuestions - totalCorrect,
      total_questions: totalQuestions,
      pass_score: access.exam.pass_score,
      passed: score >= access.exam.pass_score,
      timed_out: timedOut,
      duration_seconds: durationSeconds,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Nội dung gửi lên không phải JSON hợp lệ." },
        { status: 400 },
      );
    }
    console.error("Lỗi khi nộp đề thi trong lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể nộp đề thi." },
      { status: 500 },
    );
  }
}
