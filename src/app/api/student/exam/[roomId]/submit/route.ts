import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { Exam, ExamAttempt, ExamRoom } from "@/models";
import type { IExam } from "@/models/Exam";
import {
  finalizeRoomAndPendingAttempts,
  gradeOfficialAttempt,
  resolveExamQuestions,
  seededShuffle,
} from "@/lib/exam-grading";

const submitExamSchema = z.object({
  is_auto_submit: z.boolean().optional().default(false),
  answers: z
    .array(
      z.object({
        question_id: z.string(),
        selected_option_id: z.string().nullable(),
      })
    )
    .optional(),
});

const DEADLINE_GRACE_MS = 5000;

/**
 * POST /api/student/exam/[roomId]/submit
 * Nộp bài và chấm điểm nguyên tử cho bài thi phòng trực tuyến.
 * Kiểm tra hạn giờ nghiêm ngặt ở Server (chặn gửi đáp án mới sau khi quá giờ)
 * và chỉ cho phép xem đáp án chi tiết khi phòng thi đã kết thúc.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  if (user.role !== "student") {
    return NextResponse.json(
      { success: false, message: "Chỉ Học viên mới có thể nộp bài thi phòng." },
      { status: 403 }
    );
  }

  try {
    const { roomId } = await params;
    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      return NextResponse.json(
        { success: false, message: "ID phòng thi không hợp lệ" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = submitExamSchema.parse(body);

    await connectDB();

    const roomDoc = await ExamRoom.findById(roomId);
    if (!roomDoc) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phòng thi" },
        { status: 404 }
      );
    }

    if (roomDoc.status === "waiting") {
      return NextResponse.json(
        { success: false, message: "Phòng thi chưa bắt đầu." },
        { status: 403 }
      );
    }

    const exam = await Exam.findById(roomDoc.exam_id).lean<IExam | null>();
    if (!exam) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đề thi" },
        { status: 404 }
      );
    }

    const userObjId = new mongoose.Types.ObjectId(user.id);
    const attempt = await ExamAttempt.findOne({
      room_id: roomDoc._id,
      user_id: userObjId,
    });

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phiên làm bài của bạn" },
        { status: 404 }
      );
    }

    const resolvedQuestions = await resolveExamQuestions(exam);
    const questionMap = new Map(
      resolvedQuestions.map((q) => [q.question_id, q])
    );

    const nowMs = Date.now();
    const endMs = new Date(roomDoc.end_time).getTime();

    // Nếu đã nộp trước đó -> không cho chấm lại, trả về kết quả đã lưu
    if (attempt.status !== "in_progress") {
      const canShowDetails =
        Boolean(exam.allow_view_result_immediately) &&
        roomDoc.status === "finished";

      const detailedAnswers = canShowDetails
        ? (attempt.answers || [])
            .map((ans: { question_id: mongoose.Types.ObjectId; selected_option_id?: mongoose.Types.ObjectId | null; is_correct?: boolean }, idx: number) => {
              const qData = questionMap.get(String(ans.question_id));
              if (!qData) return null;
              const opts = exam.shuffle_options
                ? seededShuffle(
                    qData.options,
                    `${attempt._id}_${qData.question_id}`
                  ).map((o, optIdx) => ({
                    ...o,
                    option_label: String.fromCharCode(65 + optIdx),
                  }))
                : qData.options;

              return {
                index: idx + 1,
                question_id: qData.question_id,
                content: qData.content,
                difficulty_level: qData.difficulty_level,
                explanation: qData.explanation,
                options: opts,
                selected_option_id: ans.selected_option_id
                  ? String(ans.selected_option_id)
                  : null,
                is_correct: Boolean(ans.is_correct),
              };
            })
            .filter(Boolean)
        : [];

      return NextResponse.json({
        success: true,
        already_submitted: true,
        attempt_id: String(attempt._id),
        status: attempt.status,
        score: attempt.score || 0,
        total_correct: attempt.total_correct || 0,
        total_wrong: attempt.total_wrong || 0,
        total_questions: resolvedQuestions.length,
        duration_seconds: attempt.duration_seconds || 0,
        submit_time: attempt.submit_time || attempt.updatedAt,
        allow_view_result_immediately: Boolean(
          exam.allow_view_result_immediately
        ),
        waiting_room_finish:
          Boolean(exam.allow_view_result_immediately) &&
          roomDoc.status !== "finished",
        detailed_answers: detailedAnswers,
      });
    }

    const isPastDeadline =
      roomDoc.status === "finished" || nowMs > endMs + DEADLINE_GRACE_MS;
    const isTimeoutSubmit =
      isPastDeadline || nowMs >= endMs || Boolean(parsed.is_auto_submit);

    // Chỉ chấp nhận đồng bộ mảng đáp án gửi từ client khi còn trong hạn nộp (bao gồm ân hạn mạng 5s)
    // Nếu đã quá giờ, server bỏ qua answers mới gửi lên và chỉ chấm các đáp án đã auto-save hợp lệ.
    const now = new Date(nowMs);
    if (!isPastDeadline && parsed.answers && parsed.answers.length > 0) {
      const idxMap = new Map<string, number>();
      for (let i = 0; i < attempt.answers.length; i++) {
        idxMap.set(String(attempt.answers[i].question_id), i);
      }

      for (const ans of parsed.answers) {
        if (!mongoose.Types.ObjectId.isValid(ans.question_id)) continue;
        const optId =
          ans.selected_option_id &&
          mongoose.Types.ObjectId.isValid(ans.selected_option_id)
            ? new mongoose.Types.ObjectId(ans.selected_option_id)
            : null;
        const idx = idxMap.get(ans.question_id);
        if (idx !== undefined) {
          // Không ghi đè nếu trong DB đã có lựa chọn mới hơn mà client chưa có
          if (optId !== null || !attempt.answers[idx].selected_option_id) {
            attempt.answers[idx].selected_option_id = optId;
            attempt.answers[idx].answered_at = now;
          }
        } else {
          attempt.answers.push({
            question_id: new mongoose.Types.ObjectId(ans.question_id),
            selected_option_id: optId,
            answered_at: now,
          });
        }
      }
    }

    const graded = gradeOfficialAttempt(
      resolvedQuestions,
      exam.max_score || 10,
      attempt.answers || []
    );

    const effectiveSubmitTime = isTimeoutSubmit
      ? new Date(Math.min(nowMs, endMs))
      : now;

    const durationSeconds = Math.max(
      1,
      Math.round(
        (effectiveSubmitTime.getTime() -
          new Date(attempt.start_time).getTime()) /
          1000
      )
    );

    attempt.answers = graded.gradedAnswers;
    attempt.score = graded.score;
    attempt.total_correct = graded.total_correct;
    attempt.total_wrong = graded.total_wrong;
    attempt.submit_time = effectiveSubmitTime;
    attempt.duration_seconds = durationSeconds;
    attempt.status = isTimeoutSubmit ? "timed_out" : "submitted";

    await attempt.save();

    // Cập nhật trạng thái thí sinh trong ExamRoom sang "submitted"
    const candidateIdx = roomDoc.candidates.findIndex(
      (c: { user_id: mongoose.Types.ObjectId }) =>
        String(c.user_id) === String(userObjId)
    );
    if (candidateIdx >= 0) {
      roomDoc.candidates[candidateIdx].connection_status = "submitted";
      roomDoc.candidates[candidateIdx].last_seen_at = now;
    } else {
      roomDoc.candidates.push({
        user_id: userObjId,
        joined_at: attempt.start_time,
        last_seen_at: now,
        connection_status: "submitted",
      });
    }
    await roomDoc.save();

    // Nếu phòng đã quá giờ kết thúc mà chưa chốt -> chốt luôn các thí sinh còn lại
    if (nowMs >= endMs && roomDoc.status === "in_progress") {
      await finalizeRoomAndPendingAttempts(roomDoc);
    }

    // Chỉ trả chi tiết đáp án & lời giải khi phòng thi đã kết thúc để tránh lộ đề cho thí sinh đang thi
    const canShowDetails =
      Boolean(exam.allow_view_result_immediately) &&
      roomDoc.status === "finished";
    const waitingRoomFinish =
      Boolean(exam.allow_view_result_immediately) &&
      roomDoc.status !== "finished";

    const detailedAnswers = canShowDetails
      ? graded.gradedAnswers
          .map((ans, idx) => {
            const qData = questionMap.get(String(ans.question_id));
            if (!qData) return null;
            const opts = exam.shuffle_options
              ? seededShuffle(
                  qData.options,
                  `${attempt._id}_${qData.question_id}`
                ).map((o, optIdx) => ({
                  ...o,
                  option_label: String.fromCharCode(65 + optIdx),
                }))
              : qData.options;

            return {
              index: idx + 1,
              question_id: qData.question_id,
              content: qData.content,
              difficulty_level: qData.difficulty_level,
              explanation: qData.explanation,
              options: opts,
              selected_option_id: ans.selected_option_id
                ? String(ans.selected_option_id)
                : null,
              is_correct: Boolean(ans.is_correct),
            };
          })
          .filter(Boolean)
      : [];

    return NextResponse.json({
      success: true,
      already_submitted: false,
      attempt_id: String(attempt._id),
      status: attempt.status,
      score: attempt.score,
      total_correct: attempt.total_correct,
      total_wrong: attempt.total_wrong,
      total_questions: resolvedQuestions.length,
      duration_seconds: attempt.duration_seconds,
      submit_time: attempt.submit_time,
      allow_view_result_immediately: Boolean(
        exam.allow_view_result_immediately
      ),
      waiting_room_finish: waitingRoomFinish,
      detailed_answers: detailedAnswers,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu nộp bài không hợp lệ" },
        { status: 400 }
      );
    }
    console.error("Lỗi khi nộp bài thi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể nộp bài thi. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
