// src/lib/ai-agent/tools/student-tools.ts
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ExamAttempt, Question, Topic, ITopic } from "@/models";

export interface StudentToolContext {
  userId: string;
}

/**
 * 1. Phân tích kết quả học tập cá nhân toàn diện của học viên
 */
export async function analyzeMyLearningResults(context: StudentToolContext) {
  await connectDB();
  const userObjId = new mongoose.Types.ObjectId(context.userId);

  const attempts = await ExamAttempt.find({
    user_id: userObjId,
    status: { $in: ["submitted", "timed_out"] },
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "answers.question_id",
      select: "content difficulty_level topic_id options",
      populate: {
        path: "topic_id",
        select: "topic_name subject_id",
        populate: { path: "subject_id", select: "subject_name" },
      },
    })
    .populate({
      path: "topic_id",
      select: "topic_name subject_id",
      populate: { path: "subject_id", select: "subject_name" },
    })
    .populate({
      path: "exam_id",
      select: "title max_score subject_id",
      populate: { path: "subject_id", select: "subject_name" },
    })
    .lean();

  if (!attempts || attempts.length === 0) {
    return {
      status: "no_data",
      message: "Bạn chưa có lượt nộp bài nào trên hệ thống. Hãy hoàn thành ít nhất 1 bài tự luyện để AI phân tích năng lực cá nhân.",
    };
  }

  const MIN_TOPIC_QUESTIONS = 4;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalNormalizedScore10 = 0;

  const topicStatsMap = new Map<
    string,
    { topic_name: string; subject_name: string; total: number; correct: number; wrong: number }
  >();
  const subjectStatsMap = new Map<
    string,
    { subject_name: string; total: number; correct: number; wrong: number }
  >();

  for (const att of attempts) {
    const attTopic = att.topic_id as { topic_name?: string; subject_id?: { subject_name?: string } } | null;
    const attExam = att.exam_id as { title?: string; max_score?: number; subject_id?: { subject_name?: string } } | null;

    // Quy đổi điểm bài làm về thang 10 thống nhất với trang /student/ai-analysis
    const maxScore = attExam?.max_score || 10;
    const rawScore = typeof att.score === "number" ? att.score : 0;
    const norm10 = maxScore > 0 ? (rawScore / maxScore) * 10 : rawScore;
    totalNormalizedScore10 += norm10;

    totalCorrect += att.total_correct || 0;
    totalWrong += att.total_wrong || 0;

    // Suy luận tên môn học từ dữ liệu populate hoặc tiêu đề bài luyện
    let fallbackSubject = attTopic?.subject_id?.subject_name || attExam?.subject_id?.subject_name || "";

    if (!fallbackSubject && att.practice_title) {
      if (/hóa|este|ancol|axit|lipit/i.test(att.practice_title)) fallbackSubject = "Hóa Học THPT";
      else if (/toán|hàm số|tích phân|đạo hàm/i.test(att.practice_title)) fallbackSubject = "Toán Học THPT";
      else if (/vật lý|dao động|sóng cơ|điện xoay chiều/i.test(att.practice_title) && !/tính chất vật lý/i.test(att.practice_title)) fallbackSubject = "Vật Lý THPT";
    }

    for (const ans of att.answers || []) {
      const q = ans.question_id as {
        topic_id?: { topic_name?: string; subject_id?: { subject_name?: string } } | unknown;
      } | null;
      let topicName = "Kiến thức chung";
      let subjectName = fallbackSubject || "Môn học chung";

      if (q?.topic_id && typeof q.topic_id === "object") {
        const top = q.topic_id as { topic_name?: string; subject_id?: { subject_name?: string } };
        topicName = top.topic_name || topicName;
        if (top.subject_id?.subject_name) {
          subjectName = top.subject_id.subject_name;
        }
      } else if (attTopic?.topic_name) {
        topicName = attTopic.topic_name;
      }

      const mapKey = `[${subjectName}] ${topicName}`;
      const existing = topicStatsMap.get(mapKey) || {
        topic_name: topicName,
        subject_name: subjectName,
        total: 0,
        correct: 0,
        wrong: 0,
      };

      existing.total += 1;
      if (ans.is_correct) {
        existing.correct += 1;
      } else {
        existing.wrong += 1;
      }
      topicStatsMap.set(mapKey, existing);

      const subjEntry = subjectStatsMap.get(subjectName) || {
        subject_name: subjectName,
        total: 0,
        correct: 0,
        wrong: 0,
      };
      subjEntry.total += 1;
      if (ans.is_correct) subjEntry.correct += 1;
      else subjEntry.wrong += 1;
      subjectStatsMap.set(subjectName, subjEntry);
    }
  }

  const topicBreakdown = Array.from(topicStatsMap.values()).map((t) => {
    const accuracy = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
    const isReliable = t.total >= MIN_TOPIC_QUESTIONS;
    const danhGia = !isReliable
      ? `Chưa đủ dữ liệu (mới làm ${t.total} câu)`
      : accuracy >= 75
        ? "Vững chắc"
        : accuracy >= 50
          ? "Cần củng cố"
          : "Hổng kiến thức";

    return {
      mon_hoc: t.subject_name,
      chuyen_de: `${t.topic_name} (Môn: ${t.subject_name})`,
      tong_cau: t.total,
      dung: t.correct,
      sai: t.wrong,
      ty_le_chinh_xac: `${accuracy}%`,
      du_lieu_du_tin_cay: isReliable,
      danh_gia: danhGia,
      _accuracy_num: accuracy,
    };
  });

  const totalAnswered = totalCorrect + totalWrong;
  const averageScore = Math.round((totalNormalizedScore10 / attempts.length) * 10) / 10;
  const overallAccuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 1000) / 10 : 0;

  const strongTopics = topicBreakdown
    .filter((t) => t.du_lieu_du_tin_cay && t._accuracy_num >= 75)
    .sort((a, b) => b._accuracy_num - a._accuracy_num || b.tong_cau - a.tong_cau)
    .slice(0, 5);

  const weakTopics = topicBreakdown
    .filter((t) => t.du_lieu_du_tin_cay && t._accuracy_num < 75)
    .sort((a, b) => a._accuracy_num - b._accuracy_num || b.sai - a.sai)
    .slice(0, 5);

  const insufficientDataTopics = topicBreakdown
    .filter((t) => !t.du_lieu_du_tin_cay)
    .sort((a, b) => b.tong_cau - a.tong_cau);

  const subjectSummary = Array.from(subjectStatsMap.values()).map((s) => ({
    mon_hoc: s.subject_name,
    tong_cau: s.total,
    dung: s.correct,
    sai: s.wrong,
    ty_le_chinh_xac: s.total > 0 ? `${Math.round((s.correct / s.total) * 100)}%` : "0%",
    du_du_lieu_danh_gia: s.total >= 5,
  }));

  // Lấy thêm phân tích AI của bài gần nhất nếu có
  const latestAttempt = attempts[0];
  const latestAiNote = latestAttempt?.ai_analysis?.ai_feedback || null;

  return {
    status: "success",
    tong_luot_lam_bai: attempts.length,
    diem_trung_binh: averageScore,
    ty_le_chinh_xac_chung: `${overallAccuracy}%`,
    tong_cau_da_giai: totalAnswered,
    tong_cau_dung: totalCorrect,
    tong_cau_sai: totalWrong,
    thong_ke_theo_mon: subjectSummary,
    chuyen_de_manh: strongTopics.map(
      (t) => `${t.chuyen_de} (${t.dung}/${t.tong_cau} câu - ${t.ty_le_chinh_xac})`
    ),
    chuyen_de_yeu_can_cai_thien: weakTopics.map(
      (t) => `${t.chuyen_de} (đúng ${t.dung}/${t.tong_cau} câu, sai ${t.sai} câu - ${t.ty_le_chinh_xac} - ${t.danh_gia})`
    ),
    chuyen_de_chua_du_du_lieu: insufficientDataTopics.map(
      (t) => `${t.chuyen_de} (${t.dung}/${t.tong_cau} câu - mới làm ít câu, chưa đủ kết luận)`
    ),
    chi_tiet_chuyen_de: topicBreakdown.map(({ _accuracy_num, ...rest }) => {
      void _accuracy_num;
      return rest;
    }),
    nhan_xet_gan_nhat: latestAiNote,
  };
}

/**
 * 2. Lấy lịch sử làm bài của học viên (kèm so sánh tiến bộ)
 */
export async function getMyExamHistory(
  context: StudentToolContext,
  params: { limit?: number } = {}
) {
  await connectDB();
  const limit = Math.min(Math.max(Number(params.limit) || 5, 1), 20);
  const userObjId = new mongoose.Types.ObjectId(context.userId);

  const attempts = await ExamAttempt.find({
    user_id: userObjId,
    status: { $in: ["submitted", "timed_out"] },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({
      path: "topic_id",
      select: "topic_name subject_id",
      populate: { path: "subject_id", select: "subject_name" },
    })
    .populate({
      path: "exam_id",
      select: "title subject_id",
      populate: { path: "subject_id", select: "subject_name" },
    })
    .select("practice_title score total_correct total_wrong duration_seconds submit_time createdAt topic_id exam_id")
    .lean();

  if (!attempts || attempts.length === 0) {
    return {
      status: "no_data",
      message: "Bạn chưa có lượt làm bài nào trong lịch sử.",
    };
  }

  const history = attempts.map((a, idx) => {
    const topic = a.topic_id as { topic_name?: string; subject_id?: { subject_name?: string } } | null;
    const exam = a.exam_id as { title?: string; subject_id?: { subject_name?: string } } | null;
    let subjectName = topic?.subject_id?.subject_name || exam?.subject_id?.subject_name || "";

    if (!subjectName && a.practice_title) {
      if (/hóa|este|ancol|axit|lipit/i.test(a.practice_title)) subjectName = "Hóa Học THPT";
      else if (/toán|hàm số|tích phân|đạo hàm/i.test(a.practice_title)) subjectName = "Toán Học THPT";
      else if (/vật lý|dao động|sóng cơ|điện xoay chiều/i.test(a.practice_title) && !/tính chất vật lý/i.test(a.practice_title)) subjectName = "Vật Lý THPT";
    }

    const titleStr = a.practice_title || (topic?.topic_name ? `Luyện tập: ${topic.topic_name}` : (exam?.title || "Bài luyện tập"));

    return {
      stt: idx + 1,
      ma_bai_lam: a._id.toString(),
      mon_hoc: subjectName || "Môn học chung",
      tieu_de: subjectName ? `[${subjectName}] ${titleStr}` : titleStr,
      diem_so: a.score,
      dung_sai: `${a.total_correct} đúng / ${a.total_wrong} sai`,
      thoi_gian_lam: `${Math.floor((a.duration_seconds || 0) / 60)} phút`,
      ngay_nop: a.submit_time || a.createdAt,
    };
  });

  return {
    status: "success",
    tong_so_bai: history.length,
    danh_sach: history,
  };
}

/**
 * 3. Lấy chi tiết kết quả một bài làm cụ thể của học viên
 */
export async function getMyExamResult(
  context: StudentToolContext,
  params: { attemptId: string }
) {
  await connectDB();
  const { attemptId } = params;

  if (!attemptId || !mongoose.Types.ObjectId.isValid(attemptId)) {
    return { status: "error", message: "Mã bài làm không hợp lệ." };
  }

  const attempt = await ExamAttempt.findOne({
    _id: new mongoose.Types.ObjectId(attemptId),
    user_id: new mongoose.Types.ObjectId(context.userId),
    status: { $in: ["submitted", "timed_out"] },
  })
    .populate({
      path: "answers.question_id",
      select: "content difficulty_level explanation options",
    })
    .populate("topic_id", "topic_name")
    .populate("exam_id", "title allow_view_result_immediately")
    .populate("room_id", "room_code status")
    .lean();

  if (!attempt) {
    return {
      status: "not_found",
      message: "Không tìm thấy bài làm này hoặc bạn không có quyền xem bài làm của người khác.",
    };
  }

  const examDoc = attempt.exam_id as { title?: string; allow_view_result_immediately?: boolean } | null;
  const roomDoc = attempt.room_id as { room_code?: string; status?: string } | null;
  const isOfficial = attempt.attempt_type === "official" || Boolean(examDoc);
  const allowExamReview = examDoc?.allow_view_result_immediately !== false;
  const canViewDetails =
    !isOfficial || (allowExamReview && (!roomDoc || roomDoc.status === "finished"));

  if (!canViewDetails) {
    return {
      status: "locked",
      tieu_de: attempt.practice_title || examDoc?.title || "Bài thi phòng trực tuyến",
      diem_so: attempt.score,
      dung_sai: `${attempt.total_correct} đúng / ${attempt.total_wrong} sai`,
      message:
        roomDoc && roomDoc.status !== "finished"
          ? "Phòng thi vẫn đang diễn ra nên đáp án chi tiết tạm thời bị khóa để bảo mật đề thi. Vui lòng đợi giảng viên kết thúc ca thi."
          : "Giảng viên đã cấu hình không hiển thị đáp án chi tiết cho đề thi này.",
    };
  }

  const answersDetail = (attempt.answers || []).map((ans: {
    question_id: unknown;
    selected_option_id?: mongoose.Types.ObjectId | null;
    is_correct?: boolean;
  }, idx: number) => {
    const q = ans.question_id as {
      _id: mongoose.Types.ObjectId;
      content: string;
      difficulty_level: string;
      options: Array<{ _id: mongoose.Types.ObjectId; option_label: string; content: string; is_correct: boolean }>;
      explanation?: string;
    } | null;

    let selectedLabel = "Chưa chọn";
    let correctLabel = "Chưa rõ";

    if (q?.options) {
      const selected = q.options.find((o: { _id: mongoose.Types.ObjectId }) => o._id.toString() === ans.selected_option_id?.toString());
      if (selected) selectedLabel = `${selected.option_label}. ${selected.content}`;

      const correct = q.options.find((o: { is_correct: boolean }) => o.is_correct);
      if (correct) correctLabel = `${correct.option_label}. ${correct.content}`;
    }

    return {
      cau_so: idx + 1,
      ma_cau_hoi: q?._id ? q._id.toString() : null,
      noi_dung: q?.content ? q.content.slice(0, 120) + "..." : "Nội dung câu hỏi",
      ket_qua: ans.is_correct ? "ĐÚNG" : "SAI",
      phuong_an_ban_chon: selectedLabel,
      dap_an_chinh_xac: correctLabel,
    };
  });

  return {
    status: "success",
    tieu_de: attempt.practice_title,
    diem_so: attempt.score,
    dung_sai: `${attempt.total_correct} đúng / ${attempt.total_wrong} sai`,
    danh_gia_ai: attempt.ai_analysis || null,
    chi_tiet_cau_hoi: answersDetail,
  };
}

/**
 * 4. Giải thích câu trả lời của học viên
 */
export async function explainMyAnswer(
  context: StudentToolContext,
  params: { questionId: string; attemptId?: string }
) {
  await connectDB();
  const { questionId, attemptId } = params;

  if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
    return { status: "error", message: "Mã câu hỏi không hợp lệ." };
  }

  // 1. Tìm trong bài làm của học viên để lấy câu trả lời thực tế của học viên
  let studentAttempt = null;
  const qObjId = new mongoose.Types.ObjectId(questionId);
  const userObjId = new mongoose.Types.ObjectId(context.userId);

  if (attemptId && mongoose.Types.ObjectId.isValid(attemptId)) {
    studentAttempt = await ExamAttempt.findOne({
      _id: new mongoose.Types.ObjectId(attemptId),
      user_id: userObjId,
      status: { $in: ["submitted", "timed_out"] },
    })
      .populate("exam_id", "allow_view_result_immediately")
      .populate("room_id", "status")
      .lean();
  } else {
    // Tìm bài thi gần nhất mà học sinh có trả lời câu này
    studentAttempt = await ExamAttempt.findOne({
      user_id: userObjId,
      status: { $in: ["submitted", "timed_out"] },
      "answers.question_id": qObjId,
    })
      .sort({ createdAt: -1 })
      .populate("exam_id", "allow_view_result_immediately")
      .populate("room_id", "status")
      .lean();
  }

  // Bảo vệ đáp án nếu câu hỏi thuộc phòng thi Live đang diễn ra hoặc đề không cho xem đáp án
  if (studentAttempt) {
    const examDoc = studentAttempt.exam_id as { allow_view_result_immediately?: boolean } | null;
    const roomDoc = studentAttempt.room_id as { status?: string } | null;
    const isOfficial = studentAttempt.attempt_type === "official" || Boolean(examDoc);
    const allowReview = examDoc?.allow_view_result_immediately !== false;
    if (isOfficial && (!allowReview || (roomDoc && roomDoc.status !== "finished"))) {
      return {
        status: "locked",
        message:
          "Câu hỏi này nằm trong bài thi phòng trực tuyến chưa kết thúc hoặc chưa được mở đáp án, nên trợ lý chưa thể tiết lộ lời giải chi tiết lúc này.",
      };
    }
  }

  // 2. Lấy thông tin câu hỏi
  const question = await Question.findById(qObjId).populate("topic_id", "topic_name").lean();
  if (!question) {
    return { status: "not_found", message: "Không tìm thấy câu hỏi trong ngân hàng dữ liệu." };
  }

  const studentAns = studentAttempt?.answers?.find(
    (a: { question_id: mongoose.Types.ObjectId }) => a.question_id.toString() === questionId
  );

  const correctOption = question.options.find((o: { is_correct: boolean }) => o.is_correct);
  const selectedOption = studentAns?.selected_option_id
    ? question.options.find((o: { _id: mongoose.Types.ObjectId }) => o._id.toString() === studentAns.selected_option_id?.toString())
    : null;

  return {
    status: "success",
    noi_dung_cau_hoi: question.content,
    do_kho: question.difficulty_level,
    chuyen_de: (question.topic_id as unknown as ITopic)?.topic_name || "Kiến thức chung",
    dap_an_dung: correctOption ? `${correctOption.option_label}. ${correctOption.content}` : "Chưa cập nhật",
    dap_an_hoc_vien_chon: selectedOption
      ? `${selectedOption.option_label}. ${selectedOption.content}`
      : "Học viên chưa chọn câu này",
    ket_qua: studentAns ? (studentAns.is_correct ? "LÀM ĐÚNG" : "LÀM SAI") : "Chưa làm",
    cac_phuong_an: question.options.map((o: { option_label: string; content: string; is_correct: boolean }) => ({
      nhan: o.option_label,
      noi_dung: o.content,
      dung: o.is_correct,
    })),
    loi_giai_chuan: question.explanation || "Chưa có lời giải chi tiết được lưu trữ cho câu hỏi này.",
  };
}

/**
 * 5. Tra cứu khái niệm/chuyên đề kiến thức
 */
export async function searchLearningKnowledge(
  _context: StudentToolContext,
  params: { keyword: string; subjectId?: string }
) {
  await connectDB();
  const { keyword } = params;

  if (!keyword || !keyword.trim()) {
    return { status: "error", message: "Vui lòng cung cấp từ khóa kiến thức cần tra cứu." };
  }

  const topics = await Topic.find({
    topic_name: { $regex: keyword.trim(), $options: "i" },
  })
    .limit(5)
    .select("topic_name level description")
    .lean();

  return {
    status: "success",
    tu_khoa: keyword,
    ket_qua_chuyen_de: topics.map((t) => ({
      ten_chuyen_de: t.topic_name,
      cap_do: t.level,
      mo_ta: t.description || "Chuyên đề ôn thi chuẩn kiến thức.",
    })),
  };
}
