import { GoogleGenerativeAI } from "@google/generative-ai";
import { Topic, ITopic } from "@/models";
import mongoose from "mongoose";

// =========================================================================
// INTERFACES CHO PHÂN TÍCH HỌC VIÊN
// =========================================================================

export interface ITopicPerformance {
  topic_id: string;
  topic_name: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy_percent: number;
  status: "good" | "needs_review" | "warning";
}

export interface IStudentAiDiagnosisResult {
  summary: string;
  strengths: string;
  weak_points: string;
  ai_feedback: string;
  recommended_topics: {
    topic_id: string;
    topic_name: string;
  }[];
  action_items: string[];
  topic_breakdown: ITopicPerformance[];
}

export interface IPopulatedQuestionOption {
  _id?: mongoose.Types.ObjectId | string;
  option_label: string;
  content: string;
  is_correct: boolean;
}

export interface IPopulatedQuestionDetail {
  _id?: mongoose.Types.ObjectId | string;
  content?: string;
  difficulty_level?: "easy" | "medium" | "hard";
  explanation?: string;
  topic_id?: mongoose.Types.ObjectId | string | ITopic;
  options?: IPopulatedQuestionOption[];
}

export interface IAnswerWithQuestion {
  question_id: IPopulatedQuestionDetail | mongoose.Types.ObjectId | string;
  selected_option_id?: mongoose.Types.ObjectId | string | null;
  is_correct?: boolean;
}

function getPopulatedQuestion(q: unknown): IPopulatedQuestionDetail | null {
  if (
    q &&
    typeof q === "object" &&
    !(q instanceof mongoose.Types.ObjectId) &&
    "content" in (q as Record<string, unknown>)
  ) {
    return q as IPopulatedQuestionDetail;
  }
  return null;
}

// =========================================================================
// INTERFACES CHO PHÂN TÍCH GIÁO VIÊN
// =========================================================================

export interface IClassTopicDiagnostic {
  topic_id: string;
  topic_name: string;
  total_answers: number;
  total_wrong: number;
  error_rate: number;
  severity: "low" | "medium" | "high";
}

export interface ITopFailedQuestion {
  question_id: string;
  content: string;
  topic_name: string;
  wrong_count: number;
  wrong_percentage: number;
  difficulty_level: string;
  common_wrong_options: {
    option_label: string;
    content: string;
    count: number;
  }[];
}

export interface IInstructorAiReportResult {
  class_summary: {
    total_candidates: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
  };
  topic_diagnostics: IClassTopicDiagnostic[];
  top_failed_questions: ITopFailedQuestion[];
  ai_pedagogical_report: {
    general_assessment: string;
    common_misconceptions: string;
    remedial_strategies: string[];
    focus_topics_for_next_class: string[];
  };
}

// =========================================================================
// 1. DỊCH VỤ PHÂN TÍCH BÀI LÀM HỌC VIÊN
// =========================================================================

export async function analyzeStudentAttempt(data: {
  exam_title?: string;
  score: number;
  total_correct: number;
  total_wrong: number;
  duration_seconds: number;
  answers: IAnswerWithQuestion[];
}): Promise<IStudentAiDiagnosisResult> {
  const { exam_title, score, total_correct, total_wrong, answers } = data;

  // 1. Tổng hợp dữ liệu câu hỏi theo chủ đề (Topic)
  const topicStatsMap = new Map<
    string,
    {
      topic_id: string;
      topic_name: string;
      total: number;
      correct: number;
      wrong: number;
      difficulty_wrongs: { easy: number; medium: number; hard: number };
    }
  >();

  const unresolvedTopicIds = new Set<string>();

  for (const ans of answers) {
    const q = getPopulatedQuestion(ans.question_id);
    if (!q) continue;
    let topicId = "general";
    let topicName = "Chuyên đề chung";

    if (q.topic_id) {
      if (typeof q.topic_id === "object" && "topic_name" in q.topic_id) {
        topicId = String((q.topic_id as ITopic)._id);
        topicName = (q.topic_id as ITopic).topic_name;
      } else {
        topicId = String(q.topic_id);
        unresolvedTopicIds.add(topicId);
      }
    }

    if (!topicStatsMap.has(topicId)) {
      topicStatsMap.set(topicId, {
        topic_id: topicId,
        topic_name: topicName,
        total: 0,
        correct: 0,
        wrong: 0,
        difficulty_wrongs: { easy: 0, medium: 0, hard: 0 },
      });
    }

    const stat = topicStatsMap.get(topicId)!;
    stat.total += 1;
    if (ans.is_correct) {
      stat.correct += 1;
    } else {
      stat.wrong += 1;
      const diff: "easy" | "medium" | "hard" =
        q.difficulty_level === "easy" || q.difficulty_level === "hard"
          ? q.difficulty_level
          : "medium";
      stat.difficulty_wrongs[diff] += 1;
    }
  }

  // Tra cứu tên chủ đề nếu chưa có
  if (unresolvedTopicIds.size > 0) {
    const topicDocs = await Topic.find({
      _id: { $in: Array.from(unresolvedTopicIds) },
    }).select("topic_name").lean();
    for (const doc of topicDocs) {
      const stat = topicStatsMap.get(String(doc._id));
      if (stat) {
        stat.topic_name = doc.topic_name;
      }
    }
  }

  // Xếp loại từng chủ đề
  const topicBreakdown: ITopicPerformance[] = Array.from(topicStatsMap.values()).map(
    (t) => {
      const acc = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
      let status: "good" | "needs_review" | "warning" = "good";
      if (acc < 50) status = "warning";
      else if (acc < 75) status = "needs_review";

      return {
        topic_id: t.topic_id,
        topic_name: t.topic_name,
        total: t.total,
        correct: t.correct,
        wrong: t.wrong,
        accuracy_percent: acc,
        status,
      };
    }
  );

  // Sắp xếp các chủ đề yếu lên trước
  topicBreakdown.sort((a, b) => a.accuracy_percent - b.accuracy_percent);

  // Xác định các chủ đề đề xuất ôn luyện (tỷ lệ sai > 30% hoặc accuracy < 70%)
  const weakTopics = topicBreakdown.filter((t) => t.status !== "good");
  const recommendedTopics = (
    weakTopics.length > 0 ? weakTopics : topicBreakdown
  )
    .slice(0, 3)
    .map((t) => ({ topic_id: t.topic_id, topic_name: t.topic_name }));

  // 2. Thử gọi AI Gemini phân tích chuyên sâu
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const promptData = {
        exam_title: exam_title || "Bài luyện tập trắc nghiệm",
        score,
        total_questions: answers.length,
        total_correct,
        total_wrong,
        topic_summary: topicBreakdown.map((t) => ({
          chuyen_de: t.topic_name,
          tong_cau: t.total,
          dung: t.correct,
          sai: t.wrong,
          ty_le_dung: `${t.accuracy_percent}%`,
        })),
        sample_wrongs: answers
          .filter((a) => !a.is_correct && a.question_id && typeof a.question_id === "object")
          .slice(0, 5)
          .map((a) => {
            const q = a.question_id as { content?: string; difficulty_level?: string };
            return {
              noi_dung_cau_hoi: q.content?.slice(0, 150),
              do_kho: q.difficulty_level,
            };
          }),
      };

      const systemPrompt = `
Bạn là một gia sư AI thông minh và tận tâm của nền tảng luyện thi trắc nghiệm AI-Quizz.
Hãy phân tích kết quả bài thi sau đây của học sinh để chỉ ra ĐIỂM MẠNH, ĐIỂM YẾU và ĐỀ XUẤT NỘI DUNG CẦN CẢI THIỆN:
${JSON.stringify(promptData, null, 2)}

Yêu cầu xuất ra định dạng JSON duy nhất với cấu trúc sau:
{
  "summary": "Tóm tắt ngắn gọn 1-2 câu về kết quả bài làm và mức độ hoàn thành",
  "strengths": "Chỉ rõ các chuyên đề hoặc dạng bài học sinh làm tốt, nắm chắc kiến thức",
  "weak_points": "Chỉ rõ lỗ hổng kiến thức cụ thể, các phần học sinh bị sai nhiều hoặc hay nhầm lẫn",
  "ai_feedback": "Lời nhận xét động viên và định hướng sư phạm chi tiết",
  "action_items": [
    "Hành động cụ thể 1 (Ví dụ: Ôn tập lại lý thuyết định nghĩa...)",
    "Hành động cụ thể 2 (Ví dụ: Luyện thêm 5-10 bài toán dạng...)",
    "Hành động cụ thể 3"
  ]
}
Chú ý: Ngôn từ tích cực, mạch lạc, chính xác với chương trình THPT.
`;

      const aiResponse = await model.generateContent(systemPrompt);
      const text = aiResponse.response.text();
      const parsed = JSON.parse(text);

      return {
        summary: parsed.summary || `Bạn đạt ${score}/10 điểm, đúng ${total_correct}/${answers.length} câu.`,
        strengths: parsed.strengths || "Bạn đã nắm được các câu hỏi ở mức độ nhận biết cơ bản.",
        weak_points: parsed.weak_points || "Còn nhầm lẫn ở một số câu hỏi có độ khó cao hoặc tính toán nhiều bước.",
        ai_feedback: parsed.ai_feedback || "Hãy tiếp tục duy trì thói quen luyện tập đều đặn để cải thiện phản xạ làm bài.",
        recommended_topics: recommendedTopics,
        action_items: parsed.action_items || [
          "Xem lại lời giải chi tiết của các câu trả lời sai.",
          "Ôn lại các công thức và lưu ý ghi chú trong từng chuyên đề.",
          "Thực hiện bài kiểm tra củng cố theo từng chủ đề.",
        ],
        topic_breakdown: topicBreakdown,
      };
    } catch (err) {
      console.warn("Gemini AI analysis fallback to rule-based:", err);
    }
  }

  // 3. Fallback: Rule-Based Analytics Engine (Dự phòng chuẩn xác khi không có API Key hoặc lỗi mạng)
  return generateRuleBasedStudentDiagnosis(
    score,
    total_correct,
    answers.length,
    topicBreakdown,
    recommendedTopics
  );
}

function generateRuleBasedStudentDiagnosis(
  score: number,
  correct: number,
  total: number,
  topicBreakdown: ITopicPerformance[],
  recommendedTopics: { topic_id: string; topic_name: string }[]
): IStudentAiDiagnosisResult {
  const goodTopics = topicBreakdown.filter((t) => t.status === "good");
  const warnTopics = topicBreakdown.filter((t) => t.status === "warning");

  let summary = `Bạn đã hoàn thành bài thi với kết quả ${score}/10 điểm (đúng ${correct}/${total} câu).`;
  if (score >= 8.0) {
    summary += " Phong độ làm bài xuất sắc, nắm rất chắc kiến thức trọng tâm!";
  } else if (score >= 5.0) {
    summary += " Đạt chuẩn kiến thức cơ bản, cần rèn luyện thêm để bứt phá điểm số.";
  } else {
    summary += " Kết quả cho thấy còn nhiều lỗ hổng kiến thức cần ôn tập bổ sung ngay.";
  }

  let strengths = "";
  if (goodTopics.length > 0) {
    strengths = `Bạn thể hiện sự tự tin và chính xác cao ở các chuyên đề: ${goodTopics.map((t) => `"${t.topic_name}" (${t.accuracy_percent}% đúng)`).join(", ")}.`;
  } else {
    strengths = "Bạn đã có nỗ lực hoàn thành tất cả các câu hỏi trong thời gian quy định.";
  }

  let weak_points = "";
  if (warnTopics.length > 0) {
    weak_points = `Lỗ hổng kiến thức tập trung ở các chuyên đề: ${warnTopics.map((t) => `"${t.topic_name}" (sai ${t.wrong}/${t.total} câu)`).join(", ")}. Cần xem lại phương pháp giải và lý thuyết cốt lõi.`;
  } else {
    weak_points = "Một số câu hỏi mức độ vận dụng còn tính toán chậm hoặc chưa tối ưu thời gian chọn đáp án.";
  }

  const ai_feedback =
    score >= 7.0
      ? "Bạn có nền tảng tư duy rất tốt. Hãy tập trung nâng cao phản xạ ở các câu hỏi bẫy và bài toán thực tế để đạt điểm tối đa."
      : "Đừng nản lòng! Hãy dành 15-20 phút xem kỹ lại phần Lời giải chi tiết của từng câu sai bên dưới và luyện tập lại các chuyên đề được gợi ý.";

  const action_items = [
    "Đọc kỹ phần Giải thích chi tiết cho từng câu hỏi đã chọn sai trong bài thi này.",
    `Bấm vào các chuyên đề đề xuất bên dưới (${recommendedTopics.map((t) => t.topic_name).join(", ")}) để luyện thêm bài tập.`,
    "Ghi chú lại các công thức và điều kiện xác định thường xuyên gặp lỗi.",
  ];

  return {
    summary,
    strengths,
    weak_points,
    ai_feedback,
    recommended_topics: recommendedTopics,
    action_items,
    topic_breakdown: topicBreakdown,
  };
}

// =========================================================================
// 2. DỊCH VỤ PHÂN TÍCH CHẨN ĐOÁN LỚP HỌC CHO GIÁO VIÊN
// =========================================================================

export async function analyzeClassExamAttempts(data: {
  exam_title: string;
  pass_score: number;
  max_score: number;
  attempts: {
    user_id: unknown;
    score: number;
    total_correct: number;
    total_wrong: number;
    answers: IAnswerWithQuestion[];
  }[];
}): Promise<IInstructorAiReportResult> {
  const { exam_title, pass_score, attempts } = data;
  const totalCandidates = attempts.length;

  if (totalCandidates === 0) {
    return {
      class_summary: {
        total_candidates: 0,
        average_score: 0,
        highest_score: 0,
        lowest_score: 0,
        pass_rate: 0,
      },
      topic_diagnostics: [],
      top_failed_questions: [],
      ai_pedagogical_report: {
        general_assessment: "Chưa có học sinh nào nộp bài thi này.",
        common_misconceptions: "Chưa có dữ liệu.",
        remedial_strategies: [],
        focus_topics_for_next_class: [],
      },
    };
  }

  // 1. Tính toán phổ điểm lớp học
  const scores = attempts.map((a) => a.score || 0);
  const totalScoreSum = scores.reduce((sum, s) => sum + s, 0);
  const avgScore = Math.round((totalScoreSum / totalCandidates) * 10) / 10;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const passCount = attempts.filter((a) => (a.score || 0) >= pass_score).length;
  const passRate = Math.round((passCount / totalCandidates) * 100);

  // 2. Thống kê tỷ lệ sai theo từng câu hỏi & từng chủ đề
  const questionMap = new Map<
    string,
    {
      question_id: string;
      content: string;
      topic_name: string;
      difficulty_level: string;
      wrong_count: number;
      total_count: number;
      option_counts: Map<string, { label: string; content: string; count: number }>;
    }
  >();

  const topicAggregateMap = new Map<
    string,
    {
      topic_id: string;
      topic_name: string;
      total_answers: number;
      total_wrong: number;
    }
  >();

  const unresolvedTopicIds = new Set<string>();

  for (const att of attempts) {
    for (const ans of att.answers || []) {
      const q = getPopulatedQuestion(ans.question_id);
      if (!q) continue;
      const qId = String(q._id || "");
      if (!qId) continue;

      let topicId = "general";
      let topicName = "Chuyên đề chung";

      if (q.topic_id) {
        if (typeof q.topic_id === "object" && "topic_name" in q.topic_id) {
          topicId = String((q.topic_id as ITopic)._id);
          topicName = (q.topic_id as ITopic).topic_name;
        } else {
          topicId = String(q.topic_id);
          unresolvedTopicIds.add(topicId);
        }
      }

      // Thống kê câu hỏi
      if (!questionMap.has(qId)) {
        questionMap.set(qId, {
          question_id: qId,
          content: q.content || "Nội dung câu hỏi",
          topic_name: topicName,
          difficulty_level: q.difficulty_level || "medium",
          wrong_count: 0,
          total_count: 0,
          option_counts: new Map(),
        });
      }

      const qStat = questionMap.get(qId)!;
      qStat.total_count += 1;
      if (!ans.is_correct) {
        qStat.wrong_count += 1;
        // Ghi nhận phương án sai học sinh đã chọn
        if (ans.selected_option_id && q.options) {
          const opt = q.options.find(
            (o: IPopulatedQuestionOption) => String(o._id) === String(ans.selected_option_id)
          );
          if (opt && !opt.is_correct) {
            const optKey = opt.option_label;
            if (!qStat.option_counts.has(optKey)) {
              qStat.option_counts.set(optKey, {
                label: opt.option_label,
                content: opt.content,
                count: 0,
              });
            }
            qStat.option_counts.get(optKey)!.count += 1;
          }
        }
      }

      // Thống kê chuyên đề
      if (!topicAggregateMap.has(topicId)) {
        topicAggregateMap.set(topicId, {
          topic_id: topicId,
          topic_name: topicName,
          total_answers: 0,
          total_wrong: 0,
        });
      }

      const tStat = topicAggregateMap.get(topicId)!;
      tStat.total_answers += 1;
      if (!ans.is_correct) {
        tStat.total_wrong += 1;
      }
    }
  }

  // Tra cứu tên chủ đề nếu còn ID dạng string
  if (unresolvedTopicIds.size > 0) {
    const topicDocs = await Topic.find({
      _id: { $in: Array.from(unresolvedTopicIds) },
    }).select("topic_name").lean();
    for (const doc of topicDocs) {
      const docId = String(doc._id);
      const tStat = topicAggregateMap.get(docId);
      if (tStat) tStat.topic_name = doc.topic_name;

      for (const qStat of questionMap.values()) {
        if (qStat.topic_name === "Chuyên đề chung") {
          qStat.topic_name = doc.topic_name;
        }
      }
    }
  }

  // Danh sách chẩn đoán chuyên đề
  const topicDiagnostics: IClassTopicDiagnostic[] = Array.from(
    topicAggregateMap.values()
  ).map((t) => {
    const errRate =
      t.total_answers > 0 ? Math.round((t.total_wrong / t.total_answers) * 100) : 0;
    let severity: "low" | "medium" | "high" = "low";
    if (errRate >= 50) severity = "high";
    else if (errRate >= 30) severity = "medium";

    return {
      topic_id: t.topic_id,
      topic_name: t.topic_name,
      total_answers: t.total_answers,
      total_wrong: t.total_wrong,
      error_rate: errRate,
      severity,
    };
  });

  topicDiagnostics.sort((a, b) => b.error_rate - a.error_rate);

  // Top 5 câu hỏi học sinh sai nhiều nhất
  const sortedQuestions = Array.from(questionMap.values())
    .map((q) => {
      const wrongPercent =
        q.total_count > 0 ? Math.round((q.wrong_count / q.total_count) * 100) : 0;
      const sortedOptions = Array.from(q.option_counts.values()).sort(
        (a, b) => b.count - a.count
      );

      return {
        question_id: q.question_id,
        content: q.content,
        topic_name: q.topic_name,
        wrong_count: q.wrong_count,
        wrong_percentage: wrongPercent,
        difficulty_level: q.difficulty_level,
        common_wrong_options: sortedOptions.slice(0, 2).map((o) => ({
          option_label: o.label,
          content: o.content,
          count: o.count,
        })),
      };
    })
    .sort((a, b) => b.wrong_percentage - a.wrong_percentage);

  const topFailedQuestions: ITopFailedQuestion[] = sortedQuestions.slice(0, 5);

  // 3. Tương tác AI Gemini để nhận diện sai lầm chung và gợi ý sư phạm
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const promptData = {
        ten_de_thi: exam_title,
        tong_so_hoc_sinh_lam_bai: totalCandidates,
        diem_trung_binh: avgScore,
        ty_le_dat: `${passRate}%`,
        chuyen_de_sai_nhieu: topicDiagnostics.map((t) => ({
          chuyen_de: t.topic_name,
          ty_le_sai: `${t.error_rate}% (${t.total_wrong}/${t.total_answers} lượt)`,
          muc_do_canh_bao: t.severity,
        })),
        top_cau_hoi_sai_nhieu: topFailedQuestions.map((q) => ({
          noi_dung: q.content.slice(0, 160),
          chuyen_de: q.topic_name,
          ty_le_sai: `${q.wrong_percentage}%`,
          phuong_an_nham_lan: q.common_wrong_options.map(
            (o) => `Chọn nhầm [${o.option_label}]: ${o.content} (${o.count} em)`
          ),
        })),
      };

      const systemPrompt = `
Bạn là Cố vấn Phương pháp Sư phạm & Khảo thí AI của hệ thống giáo dục AI-Quizz.
Dưới đây là báo cáo thống kê kết quả làm bài của cả lớp cho đề thi: "${exam_title}":
${JSON.stringify(promptData, null, 2)}

Hãy phân tích tổng hợp báo cáo chuyên sâu dành cho GIÁO VIÊN bộ môn để giáo viên nắm được:
1. Đánh giá tổng quan năng lực của cả lớp.
2. Những mảng kiến thức và hiểu lầm phổ biến mà nhiều học sinh trong lớp bị vấp phải (chỉ ra nguyên nhân tâm lý hoặc bẫy đề thi).
3. Đề xuất chiến lược sư phạm cụ thể để giáo viên kịp thời củng cố trên lớp (thời lượng, dạng bài cần giảng lại).
4. Các chuyên đề ưu tiên số 1 cần ôn lại trước khi thi thật.

Yêu cầu xuất ra JSON duy nhất:
{
  "general_assessment": "Nhận xét tổng quan tình hình điểm số và mức độ tiếp thu bài của lớp",
  "common_misconceptions": "Phân tích các bẫy đề hoặc phần lý thuyết học sinh hay nhầm lẫn nhất",
  "remedial_strategies": [
    "Chiến lược khắc phục 1 (Ví dụ: Dành 15 phút đầu giờ chữa chi tiết câu hỏi...)",
    "Chiến lược khắc phục 2 (Ví dụ: Nhấn mạnh sự khác biệt giữa...)",
    "Chiến lược khắc phục 3"
  ],
  "focus_topics_for_next_class": [
    "Tên chuyên đề 1",
    "Tên chuyên đề 2"
  ]
}
`;

      const aiResponse = await model.generateContent(systemPrompt);
      const text = aiResponse.response.text();
      const parsed = JSON.parse(text);

      return {
        class_summary: {
          total_candidates: totalCandidates,
          average_score: avgScore,
          highest_score: highestScore,
          lowest_score: lowestScore,
          pass_rate: passRate,
        },
        topic_diagnostics: topicDiagnostics,
        top_failed_questions: topFailedQuestions,
        ai_pedagogical_report: {
          general_assessment: parsed.general_assessment || "Học sinh có tinh thần làm bài tốt, phổ điểm tương đối đồng đều.",
          common_misconceptions: parsed.common_misconceptions || "Nhiều học sinh mắc bẫy ở các câu hỏi điều kiện ràng buộc hoặc nhầm lẫn giữa các khái niệm tương tự.",
          remedial_strategies: parsed.remedial_strategies || [
            "Dành thời gian chữa kỹ 5 câu hỏi có tỷ lệ sai cao nhất trên lớp.",
            "Ôn tập lại phương pháp phân biệt các dạng bài học sinh hay chọn nhầm đáp án gây nhiễu.",
            "Giao thêm 1 phiếu bài tập ngắn cho các chuyên đề có tỷ lệ sai vượt quá 40%.",
          ],
          focus_topics_for_next_class:
            parsed.focus_topics_for_next_class ||
            topicDiagnostics.slice(0, 2).map((t) => t.topic_name),
        },
      };
    } catch (err) {
      console.warn("Gemini AI instructor analysis fallback to rule-based:", err);
    }
  }

  // Fallback Rule-based cho Giáo viên
  return {
    class_summary: {
      total_candidates: totalCandidates,
      average_score: avgScore,
      highest_score: highestScore,
      lowest_score: lowestScore,
      pass_rate: passRate,
    },
    topic_diagnostics: topicDiagnostics,
    top_failed_questions: topFailedQuestions,
    ai_pedagogical_report: {
      general_assessment: `Lớp có ${totalCandidates} thí sinh làm bài. Điểm trung bình đạt ${avgScore}/10 đ, tỷ lệ đạt chuẩn là ${passRate}%. ${
        passRate >= 70
          ? "Đa số học sinh đã nắm được trọng tâm kiến thức đề thi."
          : "Tỷ lệ học sinh chưa đạt còn tương đối cao, cần có kế hoạch phụ đạo bổ trợ."
      }`,
      common_misconceptions: `Các chuyên đề có tỷ lệ sai cao nhất gồm: ${topicDiagnostics
        .slice(0, 3)
        .map((t) => `"${t.topic_name}" (${t.error_rate}% sai)`)
        .join(", ")}. Học sinh thường nhầm lẫn khi gặp phương án gây nhiễu có hình thức gần giống đáp án đúng.`,
      remedial_strategies: [
        "Ưu tiên chữa chi tiết Top 5 câu hỏi có tỷ lệ sai cao nhất ngay trong buổi học tiếp theo.",
        "Phân tích rõ vì sao các phương án nhiễu phổ biến là sai để học sinh rút kinh nghiệm sâu sắc.",
        "Tổ chức làm bài kiểm tra nhanh 15 phút cho các chuyên đề có tỷ lệ sai vượt quá 40%.",
      ],
      focus_topics_for_next_class: topicDiagnostics.slice(0, 2).map((t) => t.topic_name),
    },
  };
}
