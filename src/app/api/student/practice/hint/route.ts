import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { connectDB } from "@/lib/db";
import { ExamAttempt, Question } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";

interface IHintTopicDoc {
  topic_name?: string;
  subject_id?: { subject_name?: string } | null;
}

interface IHintAttemptDoc {
  _id: mongoose.Types.ObjectId;
  attempt_type?: "practice" | "official";
  room_id?: mongoose.Types.ObjectId | null;
  status: string;
  topic_id?: IHintTopicDoc | null;
  answers?: Array<{ question_id: mongoose.Types.ObjectId }>;
}

interface IHintQuestionDoc {
  _id: mongoose.Types.ObjectId;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  options?: Array<{ content: string; is_correct: boolean }>;
}

/**
 * Tạo gợi ý tư duy an toàn (không tiết lộ đáp án đúng) khi không gọi được Gemini AI
 */
function buildSmartFallbackHint(
  questionContent: string,
  topicName: string,
  subjectName: string,
  difficulty: string
): string {
  const normalized = questionContent.toLowerCase();

  // Nhận diện một số nhóm kiến thức trọng tâm THPT phổ biến
  if (
    normalized.includes("agno3") ||
    normalized.includes("nh3") ||
    normalized.includes("tráng bạc") ||
    normalized.includes("fomat") ||
    normalized.includes("hcoo")
  ) {
    return "Gợi ý: Hãy phân tích cấu tạo gốc axit trong phân tử để xác định xem hợp chất có chứa nhóm chức tương tự anđehit (-CHO) hay không, từ đó liên hệ phản ứng đặc trưng với dung dịch AgNO3/NH3.";
  }
  if (
    normalized.includes("xà phòng hóa") ||
    normalized.includes("naoh") ||
    normalized.includes("thủy phân") ||
    normalized.includes("triolein") ||
    normalized.includes("tristearin")
  ) {
    return "Gợi ý: Viết phương trình thủy phân trong môi trường kiềm theo đúng tỉ lệ mol nhóm chức este (-COO-), chú ý bảo toàn khối lượng hoặc tính số mol sản phẩm muối và ancol/glixerol tạo thành.";
  }
  if (normalized.includes("este") || normalized.includes("công thức phân tử")) {
    return "Gợi ý: Xác định số liên kết pi (k) và số nguyên tử O dựa trên đặc điểm no/không no, đơn chức/đa chức và mạch hở để suy ra công thức tổng quát hoặc viết các đồng phân cấu tạo RCOOR'.";
  }
  if (
    normalized.includes("đạo hàm") ||
    normalized.includes("đồng biến") ||
    normalized.includes("nghịch biến") ||
    normalized.includes("cực trị")
  ) {
    return "Gợi ý: Tính đạo hàm y' = f'(x), tìm các điểm làm y' = 0 hoặc không xác định và lập bảng xét dấu trên từng khoảng; đối chiếu kỹ điều kiện dấu bằng tại hữu hạn điểm.";
  }
  if (
    normalized.includes("dao động") ||
    normalized.includes("chu kỳ") ||
    normalized.includes("vận tốc") ||
    normalized.includes("con lắc")
  ) {
    return "Gợi ý: Ôn lại hệ thức độc lập theo thời gian hoặc công thức định nghĩa chu kỳ/tần số góc của hệ dao động, kiểm tra kỹ các đại lượng nào phụ thuộc và không phụ thuộc vào công thức.";
  }

  const diffNote =
    difficulty === "easy"
      ? "Đây là câu hỏi mức Nhận biết — hãy rà soát lại định nghĩa, công thức tổng quát hoặc tính chất đặc trưng cơ bản nhất"
      : difficulty === "hard"
        ? "Đây là câu mức Vận dụng — hãy chia bài toán thành từng bước nhỏ, kiểm tra kỹ điều kiện biên hoặc áp dụng các định luật bảo toàn"
        : "Đây là câu mức Thông hiểu — hãy xác định đúng bản chất hiện tượng hoặc thiết lập biểu thức liên hệ trực tiếp từ dữ kiện đề bài";

  return `Gợi ý (${subjectName} · ${topicName}): ${diffNote} của chuyên đề "${topicName}", sau đó loại trừ dần các phương án sai lệch bản chất.`;
}

/**
 * Kiểm tra xem gợi ý từ AI có vô tình chứa nguyên văn đáp án đúng hay nhãn đáp án lộ liễu không
 */
function containsSpoiler(
  hint: string,
  correctOptionContent?: string
): boolean {
  const lowerHint = hint.toLowerCase();
  if (
    /đáp án\s*(đúng)?\s*(là|:)\s*[abcd]\b/i.test(lowerHint) ||
    /\bchọn\s*(phương án|đáp án)?\s*[abcd]\b/i.test(lowerHint)
  ) {
    return true;
  }

  if (correctOptionContent) {
    const cleanCorrect = correctOptionContent.trim().toLowerCase();
    if (cleanCorrect.length >= 12 && lowerHint.includes(cleanCorrect)) {
      return true;
    }
  }

  return false;
}

/**
 * POST /api/student/practice/hint
 * Sinh gợi ý phương pháp tư duy (KHÔNG tiết lộ đáp án đúng) cho câu hỏi đang tự luyện.
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { attempt_id, question_id } = body;

    if (
      !attempt_id ||
      typeof attempt_id !== "string" ||
      !mongoose.Types.ObjectId.isValid(attempt_id) ||
      !question_id ||
      typeof question_id !== "string" ||
      !mongoose.Types.ObjectId.isValid(question_id)
    ) {
      return NextResponse.json(
        { success: false, message: "Thông tin câu hỏi hoặc phiên tự luyện không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    const attempt = (await ExamAttempt.findOne({
      _id: new mongoose.Types.ObjectId(attempt_id),
      user_id: new mongoose.Types.ObjectId(user.id),
    })
      .populate({
        path: "topic_id",
        select: "topic_name subject_id",
        populate: {
          path: "subject_id",
          select: "subject_name",
        },
      })
      .lean()) as IHintAttemptDoc | null;

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phiên tự luyện" },
        { status: 404 }
      );
    }

    if (attempt.attempt_type === "official" || attempt.room_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Không hỗ trợ gợi ý trong phòng thi chính thức.",
        },
        { status: 403 }
      );
    }

    const belongsToAttempt = (attempt.answers || []).some(
      (a) => String(a.question_id) === question_id
    );
    if (!belongsToAttempt) {
      return NextResponse.json(
        { success: false, message: "Câu hỏi không thuộc phiên làm bài này" },
        { status: 403 }
      );
    }

    const question = (await Question.findById(question_id)
      .select("content difficulty_level options")
      .lean()) as IHintQuestionDoc | null;

    if (!question) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy nội dung câu hỏi" },
        { status: 404 }
      );
    }

    const topicName = attempt.topic_id?.topic_name || "Chuyên đề THPT";
    const subjectName =
      attempt.topic_id?.subject_id?.subject_name || "Kiến thức phổ thông";
    const correctOptionContent = (question.options || []).find(
      (o) => o.is_correct
    )?.content;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Chỉ gửi nội dung câu hỏi và chuyên đề (không gửi các phương án A/B/C/D hay lời giải) để chống lộ đáp án
        const prompt = `Bạn là gia sư AI môn ${subjectName} (${topicName}) cho học sinh THPT.
Học sinh đang tự luyện và gặp khó khăn ở câu hỏi sau:
"""
${question.content}
"""

Nhiệm vụ: Hãy đưa ra MỘT gợi ý ngắn gọn (2-3 câu bằng tiếng Việt) về định lý, công thức, nhóm chức hoặc hướng tư duy bước đầu để học sinh tự suy luận ra câu trả lời.
QUY TẮC BẮT BUỘC:
- TUYỆT ĐỐI KHÔNG nêu kết quả cuối cùng, con số đáp số cuối cùng hoặc hiện tượng kết luận cuối cùng.
- KHÔNG nhắc đến các chữ cái phương án A, B, C, D.
- Chỉ trả về đoạn văn gợi ý thuần túy, thân thiện, bắt đầu bằng "Gợi ý: ".`;

        const result = await model.generateContent(prompt);
        const aiText = result.response.text().trim();

        if (aiText && !containsSpoiler(aiText, correctOptionContent)) {
          return NextResponse.json({
            success: true,
            hint: aiText,
            source: "gemini",
          });
        }
      } catch (aiErr) {
        console.warn("Fallback gợi ý do lỗi Gemini:", aiErr);
      }
    }

    const fallbackHint = buildSmartFallbackHint(
      question.content,
      topicName,
      subjectName,
      question.difficulty_level
    );

    return NextResponse.json({
      success: true,
      hint: fallbackHint,
      source: "smart-guide",
    });
  } catch (error) {
    console.error("Lỗi khi tạo gợi ý câu hỏi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tạo gợi ý lúc này" },
      { status: 500 }
    );
  }
}
