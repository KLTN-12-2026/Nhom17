import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { Exam, ExamAttempt, ExamRoom } from "@/models";
import type { IExam } from "@/models/Exam";
import {
  finalizeRoomAndPendingAttempts,
  resolveExamQuestions,
  seededShuffle,
} from "@/lib/exam-grading";

interface IPopulatedSubject {
  _id: mongoose.Types.ObjectId;
  subject_name: string;
}

interface IPopulatedTeacher {
  _id: mongoose.Types.ObjectId;
  name: string;
}

/**
 * GET /api/student/exam/[roomId]/session
 * Khởi tạo hoặc khôi phục phiên làm bài thi chính thức trong phòng thi.
 * Yêu cầu học viên đã tham gia qua mã phòng, sử dụng atomic upsert chống trùng lặp attempt,
 * ẩn toàn bộ đáp án đúng khi đang thi và chỉ mở giải thích chi tiết khi phòng đã kết thúc.
 */
export async function GET(
  _request: Request,
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
      {
        success: false,
        message:
          "Chỉ tài khoản Học viên mới có thể tham gia làm bài thi chính thức.",
      },
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

    await connectDB();

    const roomDoc = await ExamRoom.findById(roomId);
    if (!roomDoc) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phòng thi" },
        { status: 404 }
      );
    }

    // Tự động chốt phòng & chấm các bài làm dở nếu đã hết giờ
    await finalizeRoomAndPendingAttempts(roomDoc);

    const exam = await Exam.findById(roomDoc.exam_id)
      .populate("subject_id", "subject_name")
      .lean<
        (IExam & { subject_id?: IPopulatedSubject | null }) | null
      >();

    if (!exam) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đề thi của phòng này" },
        { status: 404 }
      );
    }

    const teacherDoc = await ExamRoom.findById(roomId)
      .populate("teacher_id", "name")
      .select("teacher_id")
      .lean<{ teacher_id?: IPopulatedTeacher | null } | null>();

    const userObjId = new mongoose.Types.ObjectId(user.id);
    const resolvedQuestions = await resolveExamQuestions(exam);
    const questionMap = new Map(
      resolvedQuestions.map((q) => [q.question_id, q])
    );

    const candidateIdx = roomDoc.candidates.findIndex(
      (c: { user_id: mongoose.Types.ObjectId }) =>
        String(c.user_id) === String(userObjId)
    );

    let attempt = await ExamAttempt.findOne({
      room_id: roomDoc._id,
      user_id: userObjId,
    });

    // Chặn truy cập thẳng bằng URL nếu chưa join qua mã phòng
    if (candidateIdx < 0 && !attempt) {
      return NextResponse.json(
        {
          success: false,
          require_join: true,
          message:
            "Bạn chưa tham gia phòng thi qua mã phòng. Vui lòng nhập mã phòng trước khi vào thi.",
        },
        { status: 403 }
      );
    }

    // Nếu đã hoàn thành bài thi (submitted / timed_out / revoked) -> trả về kết quả
    if (
      attempt &&
      ["submitted", "timed_out", "revoked"].includes(attempt.status)
    ) {
      const canShowDetails =
        Boolean(exam.allow_view_result_immediately) &&
        roomDoc.status === "finished";
      const waitingRoomFinish =
        Boolean(exam.allow_view_result_immediately) &&
        roomDoc.status !== "finished";

      const answerMap = new Map<
        string,
        { selected_option_id: string | null; is_correct: boolean }
      >();
      const orderedIds: string[] = [];

      for (const ans of attempt.answers || []) {
        const qId = String(ans.question_id);
        orderedIds.push(qId);
        answerMap.set(qId, {
          selected_option_id: ans.selected_option_id
            ? String(ans.selected_option_id)
            : null,
          is_correct: Boolean(ans.is_correct),
        });
      }

      const finalOrder =
        orderedIds.length > 0
          ? orderedIds
          : resolvedQuestions.map((q) => q.question_id);

      const detailedAnswers = canShowDetails
        ? finalOrder
            .map((qId, idx) => {
              const qData = questionMap.get(qId);
              if (!qData) return null;
              const saved = answerMap.get(qId);
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
                selected_option_id: saved?.selected_option_id || null,
                is_correct: Boolean(saved?.is_correct),
              };
            })
            .filter(Boolean)
        : [];

      return NextResponse.json({
        success: true,
        status: attempt.status,
        attempt_id: String(attempt._id),
        room: {
          _id: String(roomDoc._id),
          room_code: roomDoc.room_code,
          status: roomDoc.status,
          start_time: roomDoc.start_time,
          end_time: roomDoc.end_time,
          teacher_name: teacherDoc?.teacher_id?.name || "Giảng viên",
        },
        exam: {
          _id: String(exam._id),
          title: exam.title,
          subject_name: exam.subject_id?.subject_name || "Môn học",
          duration_minutes: exam.duration_minutes,
          max_score: exam.max_score,
          pass_score: exam.pass_score,
          total_questions: resolvedQuestions.length,
          allow_view_result_immediately: Boolean(
            exam.allow_view_result_immediately
          ),
        },
        result: {
          score: attempt.score || 0,
          total_correct: attempt.total_correct || 0,
          total_wrong: attempt.total_wrong || 0,
          total_questions: resolvedQuestions.length,
          duration_seconds: attempt.duration_seconds || 0,
          submit_time: attempt.submit_time || attempt.updatedAt,
          status: attempt.status,
          waiting_room_finish: waitingRoomFinish,
          detailed_answers: detailedAnswers,
        },
      });
    }

    // Nếu phòng chưa bắt đầu -> yêu cầu chờ tại phòng chờ
    if (roomDoc.status === "waiting") {
      return NextResponse.json(
        {
          success: false,
          room_status: "waiting",
          message: "Vui lòng chờ Giáo viên phát lệnh bắt đầu.",
        },
        { status: 403 }
      );
    }

    // Nếu phòng đã kết thúc và học viên chưa từng khởi tạo bài làm
    if (roomDoc.status === "finished" && !attempt) {
      return NextResponse.json(
        {
          success: false,
          room_status: "finished",
          message: "Ca thi này đã kết thúc trước khi bạn bắt đầu làm bài.",
        },
        { status: 403 }
      );
    }

    // Cập nhật trạng thái kết nối & last_seen_at cho thí sinh
    if (candidateIdx >= 0) {
      if (roomDoc.candidates[candidateIdx].connection_status !== "submitted") {
        roomDoc.candidates[candidateIdx].connection_status = "connected";
      }
      roomDoc.candidates[candidateIdx].last_seen_at = new Date();
      await roomDoc.save();
    }

    // Khởi tạo phiên làm bài mới một cách nguyên tử (chống trùng lặp khi mở 2 tab)
    if (!attempt) {
      const orderedQuestions = exam.shuffle_questions
        ? seededShuffle(
            resolvedQuestions,
            `${String(roomDoc._id)}_${user.id}_questions`
          )
        : resolvedQuestions;

      try {
        attempt = await ExamAttempt.findOneAndUpdate(
          { room_id: roomDoc._id, user_id: userObjId },
          {
            $setOnInsert: {
              user_id: userObjId,
              exam_id: exam._id,
              room_id: roomDoc._id,
              attempt_type: "official",
              practice_title: exam.title,
              start_time: new Date(),
              status: "in_progress",
              answers: orderedQuestions.map((q) => ({
                question_id: new mongoose.Types.ObjectId(q.question_id),
                selected_option_id: null,
              })),
            },
          },
          { upsert: true, new: true }
        );
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code?: number }).code === 11000
        ) {
          attempt = await ExamAttempt.findOne({
            room_id: roomDoc._id,
            user_id: userObjId,
          });
        } else {
          throw err;
        }
      }
    }

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không thể khởi tạo phiên làm bài thi" },
        { status: 500 }
      );
    }

    // Dựng danh sách câu hỏi gửi về client (theo đúng thứ tự đã lưu trong attempt.answers)
    const selectionMap = new Map<string, string | null>();
    const orderedIds: string[] = [];
    for (const ans of attempt.answers || []) {
      const qId = String(ans.question_id);
      orderedIds.push(qId);
      selectionMap.set(
        qId,
        ans.selected_option_id ? String(ans.selected_option_id) : null
      );
    }

    const finalOrder =
      orderedIds.length >= resolvedQuestions.length
        ? orderedIds
        : resolvedQuestions.map((q) => q.question_id);

    const clientQuestions = finalOrder
      .map((qId, idx) => {
        const qData = questionMap.get(qId);
        if (!qData) return null;

        const shuffledOptions = exam.shuffle_options
          ? seededShuffle(qData.options, `${attempt._id}_${qData.question_id}`)
          : qData.options;

        return {
          index: idx + 1,
          _id: qData.question_id,
          question_score: qData.question_score,
          content: qData.content,
          difficulty_level: qData.difficulty_level,
          selected_option_id: selectionMap.get(qData.question_id) || null,
          // TUYỆT ĐỐI KHÔNG TRẢ VỀ is_correct hoặc explanation khi đang làm bài
          options: shuffledOptions.map((opt, optIdx) => ({
            _id: opt._id,
            option_label: exam.shuffle_options
              ? String.fromCharCode(65 + optIdx)
              : opt.option_label,
            content: opt.content,
          })),
        };
      })
      .filter(Boolean);

    const nowMs = Date.now();
    const endMs = new Date(roomDoc.end_time).getTime();
    const remainingSeconds = Math.max(0, Math.floor((endMs - nowMs) / 1000));

    return NextResponse.json({
      success: true,
      status: "in_progress",
      attempt_id: String(attempt._id),
      room: {
        _id: String(roomDoc._id),
        room_code: roomDoc.room_code,
        status: roomDoc.status,
        start_time: roomDoc.start_time,
        end_time: roomDoc.end_time,
        teacher_name: teacherDoc?.teacher_id?.name || "Giảng viên",
      },
      exam: {
        _id: String(exam._id),
        title: exam.title,
        subject_name: exam.subject_id?.subject_name || "Môn học",
        duration_minutes: exam.duration_minutes,
        max_score: exam.max_score,
        pass_score: exam.pass_score,
        total_questions: clientQuestions.length,
        allow_view_result_immediately: Boolean(
          exam.allow_view_result_immediately
        ),
      },
      questions: clientQuestions,
      remaining_seconds: remainingSeconds,
      server_now: new Date(nowMs).toISOString(),
    });
  } catch (error) {
    console.error("Lỗi khi tải phiên làm bài thi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải phiên làm bài thi" },
      { status: 500 }
    );
  }
}
