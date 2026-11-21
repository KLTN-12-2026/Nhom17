// src/lib/ai-agent/tools/teacher-tools.ts
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Exam, ExamAttempt, Question, User, Topic } from "@/models";
import { analyzeClassExamAttempts } from "@/lib/ai-analysis-service";

export interface TeacherToolContext {
  userId: string;
  role: "admin" | "instructor" | "student";
}

/**
 * Helper kiểm tra quyền sở hữu đề thi của giáo viên
 */
async function verifyExamOwnership(examId: string, context: TeacherToolContext) {
  if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
    return { valid: false, error: "Mã đề thi không hợp lệ." };
  }

  const query: Record<string, unknown> = {
    _id: new mongoose.Types.ObjectId(examId),
  };

  // Nếu không phải admin, bắt buộc đề thi phải do chính giáo viên đó tạo
  if (context.role !== "admin") {
    query.created_by = new mongoose.Types.ObjectId(context.userId);
  }

  const exam = await Exam.findOne(query).lean();
  if (!exam) {
    return {
      valid: false,
      error: "Không tìm thấy đề thi hoặc bạn không có quyền quản lý đề thi này.",
    };
  }

  return { valid: true, exam };
}

/**
 * 1. Phân tích kết quả toàn diện của một đề thi
 */
export async function analyzeExamResults(
  context: TeacherToolContext,
  params: { examId: string }
) {
  await connectDB();
  const { valid, error, exam } = await verifyExamOwnership(params.examId, context);
  if (!valid || !exam) {
    return { status: "permission_denied", message: error };
  }

  const attempts = await ExamAttempt.find({
    exam_id: exam._id,
    status: "submitted",
  })
    .populate({
      path: "answers.question_id",
      select: "content difficulty_level topic_id options",
      populate: {
        path: "topic_id",
        select: "topic_name level",
      },
    })
    .select("user_id score total_correct total_wrong answers duration_seconds submit_time")
    .lean();

  // Gọi trực tiếp service phân tích lớp học đã được xây dựng sẵn
  const analysis = await analyzeClassExamAttempts({
    exam_title: exam.title,
    pass_score: exam.pass_score || 5.0,
    max_score: exam.max_score || 10.0,
    attempts: attempts as unknown as Parameters<typeof analyzeClassExamAttempts>[0]["attempts"],
  });

  return {
    status: "success",
    ten_de_thi: exam.title,
    tong_so_cau: exam.total_questions,
    thoi_gian_lam_bai: `${exam.duration_minutes} phút`,
    kpi: analysis.class_summary,
    chan_doan_su_pham: analysis.ai_pedagogical_report,
    chuyen_de_ti_le_sai_cao: analysis.topic_diagnostics.filter((t) => t.severity === "high"),
    top_cau_sai_nhieu_nhat: analysis.top_failed_questions.slice(0, 5),
  };
}

/**
 * 2. Lấy thống kê khảo thí nhanh của bài kiểm tra
 */
export async function getExamStatistics(
  context: TeacherToolContext,
  params: { examId: string }
) {
  await connectDB();
  const { valid, error, exam } = await verifyExamOwnership(params.examId, context);
  if (!valid || !exam) {
    return { status: "permission_denied", message: error };
  }

  const attempts = await ExamAttempt.find({
    exam_id: exam._id,
    status: "submitted",
  })
    .select("score total_correct total_wrong duration_seconds submit_time")
    .lean();

  if (!attempts || attempts.length === 0) {
    return {
      status: "no_data",
      ten_de_thi: exam.title,
      message: "Chưa có học viên nào nộp bài cho đề thi này.",
    };
  }

  const scores = attempts.map((a) => (typeof a.score === "number" ? a.score : 0));
  const totalStudents = attempts.length;
  const passScore = exam.pass_score || 5.0;
  const passedStudents = scores.filter((s) => s >= passScore).length;
  const passRate = Math.round((passedStudents / totalStudents) * 100);

  const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / totalStudents) * 10) / 10;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  return {
    status: "success",
    ten_de_thi: exam.title,
    so_hoc_sinh_nop_bai: totalStudents,
    diem_trung_binh: avgScore,
    diem_cao_nhat: maxScore,
    diem_thap_nhat: minScore,
    diem_dat_chuan: passScore,
    so_hoc_sinh_dat_chuan: passedStudents,
    ty_le_dat_chuan: `${passRate}%`,
  };
}

/**
 * 3. Lấy danh sách các câu hỏi bị học sinh làm sai nhiều nhất
 */
export async function getMostIncorrectQuestions(
  context: TeacherToolContext,
  params: { examId: string; limit?: number }
) {
  await connectDB();
  const { valid, error, exam } = await verifyExamOwnership(params.examId, context);
  if (!valid || !exam) {
    return { status: "permission_denied", message: error };
  }

  const limit = Math.min(Math.max(Number(params.limit) || 5, 1), 15);

  const attempts = await ExamAttempt.find({
    exam_id: exam._id,
    status: "submitted",
  })
    .populate({
      path: "answers.question_id",
      select: "content difficulty_level topic_id options",
      populate: {
        path: "topic_id",
        select: "topic_name level",
      },
    })
    .select("user_id score total_correct total_wrong answers duration_seconds submit_time")
    .lean();

  const analysis = await analyzeClassExamAttempts({
    exam_title: exam.title,
    pass_score: exam.pass_score || 5.0,
    max_score: exam.max_score || 10.0,
    attempts: attempts as unknown as Parameters<typeof analyzeClassExamAttempts>[0]["attempts"],
  });

  return {
    status: "success",
    ten_de_thi: exam.title,
    so_luong_trich_xuat: limit,
    danh_sach_cau_hoi_sai_nhieu: analysis.top_failed_questions.slice(0, limit),
  };
}

/**
 * 4. Phân tích kết quả cụ thể của một học sinh trong đề thi được chọn
 */
export async function analyzeStudentPerformance(
  context: TeacherToolContext,
  params: { examId: string; studentIdentifier: string }
) {
  await connectDB();
  const { valid, error, exam } = await verifyExamOwnership(params.examId, context);
  if (!valid || !exam) {
    return { status: "permission_denied", message: error };
  }

  const { studentIdentifier } = params;
  if (!studentIdentifier || !studentIdentifier.trim()) {
    return { status: "error", message: "Vui lòng cung cấp tên, email hoặc ID của học sinh." };
  }

  // Tìm học sinh
  let studentQuery: Record<string, unknown> = {};
  if (mongoose.Types.ObjectId.isValid(studentIdentifier)) {
    studentQuery = { _id: new mongoose.Types.ObjectId(studentIdentifier) };
  } else {
    studentQuery = {
      $or: [
        { email: studentIdentifier.trim().toLowerCase() },
        { name: { $regex: studentIdentifier.trim(), $options: "i" } },
      ],
    };
  }

  const student = await User.findOne(studentQuery).select("name email role").lean();
  if (!student) {
    return { status: "not_found", message: `Không tìm thấy học sinh với thông tin: ${studentIdentifier}` };
  }

  const attempt = await ExamAttempt.findOne({
    exam_id: exam._id,
    user_id: student._id,
    status: "submitted",
  })
    .populate({
      path: "answers.question_id",
      select: "content difficulty_level options",
    })
    .lean();

  if (!attempt) {
    return {
      status: "no_attempt",
      message: `Học sinh ${student.name} (${student.email}) chưa nộp bài cho đề thi "${exam.title}".`,
    };
  }

  return {
    status: "success",
    hoc_sinh: {
      ten: student.name,
      email: student.email,
    },
    ten_de_thi: exam.title,
    diem_so: attempt.score,
    so_cau_dung: attempt.total_correct,
    so_cau_sai: attempt.total_wrong,
    thoi_gian_lam: `${Math.floor((attempt.duration_seconds || 0) / 60)} phút`,
    danh_gia_ai: attempt.ai_analysis || null,
  };
}

/**
 * 5. Giải thích và phân tích câu hỏi trong ngân hàng câu hỏi
 */
export async function explainQuestion(
  _context: TeacherToolContext,
  params: { questionId: string }
) {
  await connectDB();
  const { questionId } = params;

  if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
    return { status: "error", message: "Mã câu hỏi không hợp lệ." };
  }

  const question = await Question.findById(questionId)
    .populate("topic_id", "topic_name level")
    .lean();

  if (!question) {
    return { status: "not_found", message: "Không tìm thấy câu hỏi trong ngân hàng." };
  }

  const topic = question.topic_id as { topic_name?: string; level?: number } | null;
  const options = (question.options || []) as Array<{
    option_label: string;
    content: string;
    is_correct: boolean;
  }>;
  const correctOption = options.find((o) => o.is_correct);

  return {
    status: "success",
    ma_cau_hoi: question._id.toString(),
    noi_dung: question.content,
    do_kho: question.difficulty_level,
    chuyen_de: topic?.topic_name || "Chưa phân loại",
    dap_an_chuan: correctOption ? `${correctOption.option_label}. ${correctOption.content}` : "Chưa rõ",
    cac_phuong_an: options.map((o) => ({
      nhan: o.option_label,
      noi_dung: o.content,
      dung: o.is_correct,
    })),
    loi_giai_chi_tiet: question.explanation || "Chưa có lời giải chi tiết được lưu trong hệ thống.",
  };
}

/**
 * 6. Hỗ trợ phương pháp sư phạm và truyền đạt kiến thức
 */
export async function teachingAssistant(
  _context: TeacherToolContext,
  params: { topicName: string; targetGrade?: string }
) {
  await connectDB();
  const { topicName, targetGrade = "Lớp 12 (Ôn thi THPT Quốc Gia)" } = params;

  // Tìm kiếm thông tin chuyên đề trong cơ sở dữ liệu nếu có
  const matchedTopic = await Topic.findOne({
    topic_name: { $regex: topicName.trim(), $options: "i" },
  }).lean();

  return {
    status: "success",
    chuyen_de_yeu_cau: topicName,
    doi_tuong_hoc_sinh: targetGrade,
    chuyen_de_he_thong: matchedTopic ? matchedTopic.topic_name : null,
    goi_y_su_pham: {
      muc_tieu: `Giúp học sinh nắm chắc bản chất, không học vẹt công thức ở phần ${topicName}.`,
      phuong_phap: "Phân bậc tư duy từ Nhận biết -> Thông hiểu -> Vận dụng -> Bài toán thực tế.",
      loi_thuong_gap: "Học sinh hay nhầm lẫn điều kiện biên, quên xét điều kiện xác định hoặc tính toán vội vàng.",
    },
  };
}
