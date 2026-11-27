import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { getAccessibleRoadmapExam } from "@/lib/student-roadmap-exam";
import { ExamAttempt } from "@/models";
import type { IExamOptionSnapshot } from "@/models/Exam";

type RouteContext = {
  params: Promise<{ id: string; examId: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { user, errorResponse } = await checkApiAuthorization(["student"]);
  if (errorResponse) return errorResponse;

  try {
    const { id, examId } = await params;
    await connectDB();
    const access = await getAccessibleRoadmapExam(id, examId, user.id);
    if ("error" in access && access.error) {
      return NextResponse.json(
        { success: false, message: access.error.message },
        { status: access.error.status },
      );
    }

    const examQuestions = [...access.exam.questions].sort(
      (left, right) => left.question_order - right.question_order,
    );
    const distinctQuestionIds = new Set(
      examQuestions.map((question) => String(question.question_id)),
    );
    if (
      examQuestions.length === 0 ||
      distinctQuestionIds.size !== examQuestions.length ||
      examQuestions.some(
        (question) => !question.question_snapshot?.options?.length,
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Đề thi chưa có câu hỏi hợp lệ." },
        { status: 409 },
      );
    }

    const attempt = await ExamAttempt.create({
      user_id: new mongoose.Types.ObjectId(user.id),
      exam_id: new mongoose.Types.ObjectId(examId),
      topic_id: null,
      practice_title: access.exam.title,
      attempt_type: "official",
      room_id: null,
      status: "in_progress",
      start_time: new Date(),
      score: 0,
      total_correct: 0,
      total_wrong: 0,
      duration_seconds: 0,
      answers: examQuestions.map((question) => ({
        question_id: question.question_id,
        selected_option_id: null,
      })),
    });

    return NextResponse.json({
      success: true,
      attempt_id: String(attempt._id),
      exam: {
        title: access.exam.title,
        duration_minutes: access.exam.duration_minutes,
        pass_score: access.exam.pass_score,
      },
      questions: examQuestions.map((question) => ({
        _id: String(question.question_id),
        content: question.question_snapshot?.content || "",
        options: (question.question_snapshot?.options || []).map(
          (option: IExamOptionSnapshot) => ({
          _id: String(option.option_id),
          option_label: option.option_label,
          content: option.content,
          }),
        ),
      })),
    });
  } catch (error) {
    console.error("Lỗi khi bắt đầu đề thi trong lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể bắt đầu đề thi." },
      { status: 500 },
    );
  }
}
