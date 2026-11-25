import mongoose from "mongoose";
import { Exam, ExamAttempt, ExamRoom, Question } from "@/models";
import type { IExam, IExamQuestion } from "@/models/Exam";
import type { IExamRoom } from "@/models/ExamRoom";
import type { IStudentAnswer } from "@/models/ExamAttempt";

export interface ResolvedExamOption {
  _id: string;
  option_label: string;
  content: string;
  is_correct: boolean;
}

export interface ResolvedExamQuestion {
  question_id: string;
  question_order: number;
  question_score: number;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation: string;
  options: ResolvedExamOption[];
}

/**
 * Tạo bộ sinh số giả ngẫu nhiên theo chuỗi seed (Mulberry32 + FNV-1a)
 * Đảm bảo thứ tự câu hỏi / đáp án xáo trộn giữ nguyên khi học viên F5 tải lại trang.
 */
function createSeededRandom(seedStr: string): () => number {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seedStr: string): T[] {
  const result = [...items];
  const rand = createSeededRandom(seedStr);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Chuẩn hóa danh sách câu hỏi từ Exam.questions (ưu tiên question_snapshot, fallback về Question collection)
 */
export async function resolveExamQuestions(
  exam: Pick<IExam, "questions"> | { questions?: IExamQuestion[] }
): Promise<ResolvedExamQuestion[]> {
  const rawQuestions = exam.questions || [];

  const missingQuestionIds: mongoose.Types.ObjectId[] = [];
  for (const q of rawQuestions) {
    const snap = q.question_snapshot;
    if (!snap || !snap.content || !snap.options || snap.options.length === 0) {
      if (q.question_id) {
        missingQuestionIds.push(new mongoose.Types.ObjectId(String(q.question_id)));
      }
    }
  }

  const fallbackMap = new Map<
    string,
    {
      content: string;
      difficulty_level: "easy" | "medium" | "hard";
      explanation?: string;
      options: Array<{
        _id?: mongoose.Types.ObjectId;
        option_label: string;
        content: string;
        is_correct: boolean;
      }>;
    }
  >();

  if (missingQuestionIds.length > 0) {
    const dbQuestions = await Question.find({
      _id: { $in: missingQuestionIds },
    })
      .select("content difficulty_level explanation options")
      .lean();

    for (const dq of dbQuestions) {
      fallbackMap.set(String(dq._id), {
        content: dq.content,
        difficulty_level: dq.difficulty_level,
        explanation: dq.explanation,
        options: dq.options || [],
      });
    }
  }

  const sortedRaw = [...rawQuestions].sort(
    (a, b) => (a.question_order || 0) - (b.question_order || 0)
  );

  const resolved: ResolvedExamQuestion[] = [];
  for (let i = 0; i < sortedRaw.length; i++) {
    const q = sortedRaw[i];
    const qId = String(q.question_id);
    const snap = q.question_snapshot;

    if (snap && snap.content && snap.options && snap.options.length > 0) {
      resolved.push({
        question_id: qId,
        question_order: q.question_order || i + 1,
        question_score: typeof q.question_score === "number" ? q.question_score : 1,
        content: snap.content,
        difficulty_level: snap.difficulty_level || "medium",
        explanation: snap.explanation || "",
        options: snap.options.map((opt) => ({
          _id: String(opt.option_id),
          option_label: opt.option_label,
          content: opt.content,
          is_correct: Boolean(opt.is_correct),
        })),
      });
    } else {
      const fb = fallbackMap.get(qId);
      if (fb) {
        resolved.push({
          question_id: qId,
          question_order: q.question_order || i + 1,
          question_score: typeof q.question_score === "number" ? q.question_score : 1,
          content: fb.content,
          difficulty_level: fb.difficulty_level || "medium",
          explanation: fb.explanation || "",
          options: fb.options.map((opt) => ({
            _id: String(opt._id),
            option_label: opt.option_label,
            content: opt.content,
            is_correct: Boolean(opt.is_correct),
          })),
        });
      }
    }
  }

  return resolved;
}

/**
 * Chấm điểm bài thi chính thức dựa trên Exam snapshot và danh sách đáp án đã lưu của học viên
 */
export function gradeOfficialAttempt(
  resolvedQuestions: ResolvedExamQuestion[],
  maxScore: number,
  existingAnswers: Array<{
    question_id: mongoose.Types.ObjectId | string;
    selected_option_id?: mongoose.Types.ObjectId | string | null;
    answered_at?: Date;
  }>
): {
  gradedAnswers: IStudentAnswer[];
  score: number;
  total_correct: number;
  total_wrong: number;
} {
  const questionMap = new Map<string, ResolvedExamQuestion>();
  let totalRawScore = 0;
  for (const q of resolvedQuestions) {
    questionMap.set(q.question_id, q);
    totalRawScore += q.question_score || 1;
  }

  // Giữ thứ tự câu hỏi từ attempt.answers nếu đã được khởi tạo đủ; nếu không dùng thứ tự của đề
  const answerSelectionMap = new Map<
    string,
    { selected_option_id: string | null; answered_at?: Date }
  >();
  for (const ans of existingAnswers) {
    const qId = String(ans.question_id);
    answerSelectionMap.set(qId, {
      selected_option_id: ans.selected_option_id
        ? String(ans.selected_option_id)
        : null,
      answered_at: ans.answered_at,
    });
  }

  const orderedQuestionIds =
    existingAnswers.length >= resolvedQuestions.length
      ? existingAnswers
          .map((a) => String(a.question_id))
          .filter((qId) => questionMap.has(qId))
      : resolvedQuestions.map((q) => q.question_id);

  // Đảm bảo không bị sót câu nào nếu existingAnswers thiếu
  const seen = new Set(orderedQuestionIds);
  for (const q of resolvedQuestions) {
    if (!seen.has(q.question_id)) {
      orderedQuestionIds.push(q.question_id);
    }
  }

  let totalCorrect = 0;
  let totalWrong = 0;
  let earnedRawScore = 0;

  const gradedAnswers: IStudentAnswer[] = orderedQuestionIds.map((qId) => {
    const qData = questionMap.get(qId)!;
    const saved = answerSelectionMap.get(qId);
    const selectedId = saved?.selected_option_id || null;

    let isCorrect = false;
    if (selectedId) {
      const matchedOpt = qData.options.find((opt) => opt._id === selectedId);
      if (matchedOpt && matchedOpt.is_correct) {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      totalCorrect += 1;
      earnedRawScore += qData.question_score || 1;
    } else {
      totalWrong += 1;
    }

    return {
      question_id: new mongoose.Types.ObjectId(qId),
      selected_option_id:
        selectedId && mongoose.Types.ObjectId.isValid(selectedId)
          ? new mongoose.Types.ObjectId(selectedId)
          : null,
      is_correct: isCorrect,
      answered_at: saved?.answered_at || new Date(),
    };
  });

  const effectiveMaxScore = maxScore > 0 ? maxScore : totalRawScore || 10;
  const score =
    totalRawScore > 0
      ? Math.round((earnedRawScore / totalRawScore) * effectiveMaxScore * 100) /
        100
      : 0;

  return {
    gradedAnswers,
    score,
    total_correct: totalCorrect,
    total_wrong: totalWrong,
  };
}

/**
 * Chốt ca thi và tự động chấm các bài thi đang làm dở (status: "in_progress")
 * khi phòng thi hết giờ hoặc khi giảng viên bấm Kết thúc ca thi.
 */
export async function finalizeRoomAndPendingAttempts(
  room: IExamRoom,
  options: { forceFinish?: boolean } = {}
): Promise<boolean> {
  const now = new Date();
  const isExpired =
    room.status === "in_progress" && now.getTime() >= new Date(room.end_time).getTime();

  if (!options.forceFinish && !isExpired) {
    return false;
  }

  const effectiveEndTime = options.forceFinish
    ? now
    : new Date(Math.min(now.getTime(), new Date(room.end_time).getTime()));

  room.status = "finished";
  if (options.forceFinish) {
    room.end_time = effectiveEndTime;
  }

  const pendingAttempts = await ExamAttempt.find({
    room_id: room._id,
    status: "in_progress",
  });

  if (pendingAttempts.length > 0) {
    const exam = await Exam.findById(room.exam_id).lean<IExam | null>();
    if (exam) {
      const resolvedQuestions = await resolveExamQuestions(exam);
      const submittedUserIds = new Set<string>();

      for (const attempt of pendingAttempts) {
        const graded = gradeOfficialAttempt(
          resolvedQuestions,
          exam.max_score || 10,
          attempt.answers || []
        );

        attempt.answers = graded.gradedAnswers;
        attempt.score = graded.score;
        attempt.total_correct = graded.total_correct;
        attempt.total_wrong = graded.total_wrong;
        attempt.submit_time = effectiveEndTime;
        attempt.duration_seconds = Math.max(
          0,
          Math.round(
            (effectiveEndTime.getTime() - new Date(attempt.start_time).getTime()) / 1000
          )
        );
        attempt.status = "timed_out";
        await attempt.save();
        submittedUserIds.add(String(attempt.user_id));
      }

      for (const candidate of room.candidates) {
        if (submittedUserIds.has(String(candidate.user_id))) {
          candidate.connection_status = "submitted";
        }
      }
    }
  }

  await room.save();
  return true;
}

/**
 * Tự động đóng toàn bộ các phòng thi đã quá giờ kết thúc (dùng trước khi liệt kê phòng)
 */
export async function finalizeAllExpiredRooms(filter: Record<string, unknown> = {}) {
  const expiredRooms = await ExamRoom.find({
    ...filter,
    status: "in_progress",
    end_time: { $lte: new Date() },
  });

  for (const room of expiredRooms) {
    await finalizeRoomAndPendingAttempts(room);
  }
}

/**
 * Đánh dấu các thí sinh không có tín hiệu quá 12 giây sang trạng thái "disconnected"
 */
export async function syncCandidatesConnectionStatus(
  room: IExamRoom,
  staleThresholdMs = 12_000
): Promise<boolean> {
  if (room.status === "finished" || !Array.isArray(room.candidates)) {
    return false;
  }

  const nowMs = Date.now();
  let changed = false;

  for (const candidate of room.candidates) {
    if (candidate.connection_status === "connected") {
      const lastSeen = candidate.last_seen_at || candidate.joined_at;
      if (lastSeen && nowMs - new Date(lastSeen).getTime() > staleThresholdMs) {
        candidate.connection_status = "disconnected";
        changed = true;
      }
    }
  }

  if (changed) {
    await room.save();
  }
  return changed;
}

