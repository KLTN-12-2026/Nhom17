// src/lib/ai-agent/gemini-client.ts
import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionDeclaration,
  Tool,
} from "@google/generative-ai";
import { STUDENT_AGENT_SYSTEM_PROMPT } from "./prompts/student-prompt";
import { TEACHER_AGENT_SYSTEM_PROMPT } from "./prompts/teacher-prompt";
import { getDefaultGeminiModel, getGeminiApiKey } from "@/lib/ai-gemini";

// =========================================================================
// 1. TOOL FUNCTION DECLARATIONS CHO HỌC VIÊN
// =========================================================================

export const studentFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: "analyzeMyLearningResults",
    description:
      "Phân tích kết quả học tập cá nhân toàn diện của học viên, chỉ ra điểm mạnh, các chuyên đề hổng kiến thức và gợi ý ôn tập tiếp theo.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "getMyExamHistory",
    description:
      "Lấy danh sách các bài thi hoặc bài tự luyện mà học viên đã nộp gần đây kèm điểm số, thời gian làm và kết quả đúng/sai.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.INTEGER,
          description: "Số lượng bài thi gần nhất cần lấy (tối thiểu 1, tối đa 20, mặc định 5).",
        },
      },
    },
  },
  {
    name: "getMyExamResult",
    description:
      "Lấy chi tiết kết quả một bài làm cụ thể của học viên (bao gồm câu đúng, câu sai, phương án đã chọn).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        attemptId: {
          type: SchemaType.STRING,
          description: "Mã bài làm (attemptId).",
        },
      },
      required: ["attemptId"],
    },
  },
  {
    name: "explainMyAnswer",
    description:
      "Giải thích chi tiết phương pháp giải một câu hỏi trong bài làm của học viên, giải thích vì sao đáp án đúng là đúng, bẫy nhận thức và tại sao các phương án khác lại sai.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        questionId: {
          type: SchemaType.STRING,
          description: "Mã câu hỏi (questionId).",
        },
        attemptId: {
          type: SchemaType.STRING,
          description: "Mã bài làm chứa câu hỏi đó (nếu có) để đối chiếu phương án học sinh đã chọn.",
        },
      },
      required: ["questionId"],
    },
  },
  {
    name: "searchLearningKnowledge",
    description:
      "Tra cứu các chuyên đề kiến thức, lý thuyết và công thức trong ngân hàng bài học môn học.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        keyword: {
          type: SchemaType.STRING,
          description: "Từ khóa chuyên đề cần tra cứu.",
        },
      },
      required: ["keyword"],
    },
  },
];

// =========================================================================
// 2. TOOL FUNCTION DECLARATIONS CHO GIÁO VIÊN
// =========================================================================

export const teacherFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: "getMyCreatedExams",
    description:
      "Lấy danh sách các đề thi mà giáo viên đang đăng nhập đã tạo kèm số lượt học viên đã nộp bài thi và điểm trung bình. Dùng công cụ này trước khi cần tìm mã đề thi (examId) để phân tích.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "analyzeExamResults",
    description:
      "Phân tích toàn diện kết quả của một đề thi do giáo viên quản lý (KPI điểm số, chuyên đề học sinh hay sai, các câu hỏi mất điểm nhiều nhất và chẩn đoán sư phạm).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        examId: {
          type: SchemaType.STRING,
          description: "Mã đề thi cần phân tích (examId).",
        },
      },
      required: ["examId"],
    },
  },
  {
    name: "getExamStatistics",
    description:
      "Lấy thống kê khảo thí nhanh của bài kiểm tra (số học sinh nộp bài, điểm trung bình, điểm cao nhất/thấp nhất, tỷ lệ đạt chuẩn).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        examId: {
          type: SchemaType.STRING,
          description: "Mã đề thi.",
        },
      },
      required: ["examId"],
    },
  },
  {
    name: "getMostIncorrectQuestions",
    description:
      "Lấy danh sách các câu hỏi bị học sinh làm sai nhiều nhất trong một đề thi.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        examId: {
          type: SchemaType.STRING,
          description: "Mã đề thi.",
        },
        limit: {
          type: SchemaType.INTEGER,
          description: "Số lượng câu hỏi cần trích xuất (mặc định 5).",
        },
      },
      required: ["examId"],
    },
  },
  {
    name: "analyzeStudentPerformance",
    description:
      "Phân tích kết quả cụ thể của một học sinh trong đề thi được chọn để giáo viên nhận xét hoặc phản hồi cho phụ huynh.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        examId: {
          type: SchemaType.STRING,
          description: "Mã đề thi.",
        },
        studentIdentifier: {
          type: SchemaType.STRING,
          description: "Tên, email hoặc ID của học sinh cần xem kết quả.",
        },
      },
      required: ["examId", "studentIdentifier"],
    },
  },
  {
    name: "explainQuestion",
    description:
      "Giải thích và phân tích câu hỏi trong ngân hàng câu hỏi, hỗ trợ giáo viên chuẩn bị lời giải chi tiết và phát hiện bẫy câu hỏi.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        questionId: {
          type: SchemaType.STRING,
          description: "Mã câu hỏi (questionId).",
        },
      },
      required: ["questionId"],
    },
  },
  {
    name: "teachingAssistant",
    description:
      "Gợi ý phương pháp sư phạm, ví dụ minh họa và cách truyền đạt dễ hiểu cho một chuyên đề khó.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topicName: {
          type: SchemaType.STRING,
          description: "Tên chuyên đề kiến thức cần hỗ trợ giảng dạy.",
        },
        targetGrade: {
          type: SchemaType.STRING,
          description: "Đối tượng học sinh (mặc định: Lớp 12 Ôn thi THPT Quốc Gia).",
        },
      },
      required: ["topicName"],
    },
  },
];

/**
 * Khởi tạo Gemini Model được cấu hình riêng theo vai trò
 */
export function getAgentGenerativeModel(
  role: "student" | "teacher",
  modelNameOverride?: string
) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "Chưa cấu hình GEMINI_API_KEY trong file .env.local. Vui lòng lấy API Key miễn phí tại Google AI Studio (https://aistudio.google.com) và gán vào GEMINI_API_KEY=... trong .env.local, sau đó restart lại server Next.js."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const isStudent = role === "student";
  const systemInstruction = isStudent
    ? STUDENT_AGENT_SYSTEM_PROMPT
    : TEACHER_AGENT_SYSTEM_PROMPT;

  const tools: Tool[] = [
    {
      functionDeclarations: isStudent
        ? studentFunctionDeclarations
        : teacherFunctionDeclarations,
    },
  ];

  const modelName = modelNameOverride || getDefaultGeminiModel();

  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    tools,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
  });
}
