// src/lib/ai-agent/agent-orchestrator.ts
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { AiConversation, IAiConversation } from "@/models/AiConversation";
import { getAgentGenerativeModel } from "./gemini-client";
import { getGeminiCandidateModels } from "@/lib/ai-gemini";
import * as studentTools from "./tools/student-tools";
import * as teacherTools from "./tools/teacher-tools";

export interface AgentChatInput {
  userId: string;
  userRole: "admin" | "instructor" | "student";
  message: string;
  conversationId?: string | null;
  contextId?: string | null;
  contextType?: "exam" | "attempt" | "general";
}

export interface AgentChatOutput {
  success: boolean;
  conversationId: string;
  title: string;
  message: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  error?: string;
}

/**
 * Dispatcher thực thi các Tools của Học viên
 */
async function executeStudentTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
) {
  const context: studentTools.StudentToolContext = { userId };

  switch (toolName) {
    case "analyzeMyLearningResults":
      return await studentTools.analyzeMyLearningResults(context);

    case "getMyExamHistory":
      return await studentTools.getMyExamHistory(context, {
        limit: typeof args.limit === "number" ? args.limit : undefined,
      });

    case "getMyExamResult":
      return await studentTools.getMyExamResult(context, {
        attemptId: String(args.attemptId || ""),
      });

    case "explainMyAnswer":
      return await studentTools.explainMyAnswer(context, {
        questionId: String(args.questionId || ""),
        attemptId: args.attemptId ? String(args.attemptId) : undefined,
      });

    case "searchLearningKnowledge":
      return await studentTools.searchLearningKnowledge(context, {
        keyword: String(args.keyword || ""),
        subjectId: args.subjectId ? String(args.subjectId) : undefined,
      });

    default:
      return { status: "error", message: `Không tìm thấy công cụ học viên: ${toolName}` };
  }
}

/**
 * Dispatcher thực thi các Tools của Giáo viên
 */
async function executeTeacherTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  userRole: "admin" | "instructor" | "student"
) {
  const context: teacherTools.TeacherToolContext = { userId, role: userRole };

  switch (toolName) {
    case "getMyCreatedExams":
      return await teacherTools.getMyCreatedExams(context);

    case "analyzeExamResults":
      return await teacherTools.analyzeExamResults(context, {
        examId: String(args.examId || ""),
      });

    case "getExamStatistics":
      return await teacherTools.getExamStatistics(context, {
        examId: String(args.examId || ""),
      });

    case "getMostIncorrectQuestions":
      return await teacherTools.getMostIncorrectQuestions(context, {
        examId: String(args.examId || ""),
        limit: typeof args.limit === "number" ? args.limit : undefined,
      });

    case "analyzeStudentPerformance":
      return await teacherTools.analyzeStudentPerformance(context, {
        examId: String(args.examId || ""),
        studentIdentifier: String(args.studentIdentifier || ""),
      });

    case "explainQuestion":
      return await teacherTools.explainQuestion(context, {
        questionId: String(args.questionId || ""),
      });

    case "teachingAssistant":
      return await teacherTools.teachingAssistant(context, {
        topicName: String(args.topicName || ""),
        targetGrade: args.targetGrade ? String(args.targetGrade) : undefined,
      });

    default:
      return { status: "error", message: `Không tìm thấy công cụ giáo viên: ${toolName}` };
  }
}

/**
 * Trình điều phối hội thoại chính (Agent Orchestrator)
 */
export async function runAgentConversation(
  input: AgentChatInput
): Promise<AgentChatOutput> {
  await connectDB();

  const { userId, userRole, message, conversationId, contextId, contextType } = input;
  const agentRole = userRole === "student" ? "student" : "teacher";

  // 1. Tải hoặc khởi tạo phiên hội thoại trong MongoDB
  let conversation: IAiConversation | null = null;

  if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
    conversation = await AiConversation.findOne({
      _id: new mongoose.Types.ObjectId(conversationId),
      user_id: new mongoose.Types.ObjectId(userId),
      agent_role: agentRole,
    });
  }

  if (!conversation) {
    conversation = new AiConversation({
      user_id: new mongoose.Types.ObjectId(userId),
      agent_role: agentRole,
      title: "Cuộc trò chuyện mới",
      context_id: contextId && mongoose.Types.ObjectId.isValid(contextId) ? new mongoose.Types.ObjectId(contextId) : null,
      context_type: contextType || "general",
      messages: [],
    }) as IAiConversation;
  }

  const activeConv = conversation;

  // Cập nhật tiêu đề hội thoại nếu là tin nhắn đầu tiên
  if (activeConv.messages.length === 0) {
    const cleanTitle = message.slice(0, 45).replace(/[\r\n]+/g, " ").trim();
    activeConv.title = cleanTitle ? `${cleanTitle}...` : "Cuộc trò chuyện mới";
  }

  // 2. Chuyển đổi lịch sử tin nhắn sang định dạng Gemini
  const geminiHistory = activeConv.messages.map((m) => ({
    role: m.role === "model" ? "model" : "user",
    parts: [{ text: m.content || "(Thao tác dữ liệu)" }],
  }));

  // Gắn thêm ngữ cảnh nếu cuộc trò chuyện gắn với đề thi hoặc bài làm cụ thể
  let contextualMessage = message;
  if (activeConv.context_id && activeConv.messages.length === 0) {
    if (activeConv.context_type === "attempt") {
      contextualMessage = `[Học viên đang xem bài làm có ID: ${activeConv.context_id}]. Yêu cầu: ${message}`;
    } else if (activeConv.context_type === "exam") {
      contextualMessage = `[Giáo viên đang làm việc với đề thi có ID: ${activeConv.context_id}]. Yêu cầu: ${message}`;
    }
  }

  // 3. Khởi tạo Gemini Model với bộ Tools tương ứng
  let responseText = "";
  const executedToolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

  try {
    const candidateModels = getGeminiCandidateModels();
    let lastModelError: unknown = null;

    for (const modelName of candidateModels) {
      try {
        const model = getAgentGenerativeModel(agentRole, modelName);
        const chat = model.startChat({
          history: geminiHistory,
        });

        let result = await chat.sendMessage(contextualMessage);
        let iterations = 0;
        const MAX_TOOL_STEPS = 4;
        const stepToolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
        let modelReply = "";

        // Vòng lặp Function Calling
        while (iterations < MAX_TOOL_STEPS) {
          iterations += 1;
          const calls = result.response.functionCalls();

          if (!calls || calls.length === 0) {
            modelReply = result.response.text();
            break;
          }

          // Xử lý từng Function Call
          const functionResponses = [];
          for (const call of calls) {
            stepToolCalls.push({
              name: call.name,
              args: (call.args as Record<string, unknown>) || {},
            });

            let toolOutput: Record<string, unknown>;
            if (agentRole === "student") {
              toolOutput = await executeStudentTool(call.name, (call.args as Record<string, unknown>) || {}, userId);
            } else {
              toolOutput = await executeTeacherTool(call.name, (call.args as Record<string, unknown>) || {}, userId, userRole);
            }

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: toolOutput,
              },
            });
          }

          // Gửi kết quả Tool về lại cho Gemini tiếp tục suy luận
          result = await chat.sendMessage(functionResponses);
        }

        if (!modelReply) {
          modelReply = result.response.text();
        }

        responseText = modelReply;
        executedToolCalls.push(...stepToolCalls);
        lastModelError = null;
        break;
      } catch (err) {
        lastModelError = err;
        console.warn(`Gemini model ${modelName} failed, trying fallback:`, err);
      }
    }

    if (lastModelError) {
      throw lastModelError;
    }
  } catch (apiError) {
    console.error("Lỗi Gemini API trong Agent Orchestrator:", apiError);

    if (
      agentRole === "student" &&
      (message.includes("kết quả") ||
        message.includes("điểm") ||
        message.includes("học tập"))
    ) {
      try {
        const directStats = await studentTools.analyzeMyLearningResults({
          userId,
        });
        if (directStats.status === "success") {
          responseText =
            `### 📊 TỔNG HỢP KẾT QUẢ HỌC TẬP CỦA BẠN:\n\n` +
            `- **Số lượt đã làm:** ${directStats.tong_luot_lam_bai} bài\n` +
            `- **Điểm trung bình:** ${directStats.diem_trung_binh} / 10\n` +
            `- **Tỷ lệ chính xác:** ${directStats.ty_le_chinh_xac_chung}\n` +
            `- **Chuyên đề nắm vững:** ${directStats.chuyen_de_manh?.join(", ") || "Đang tích lũy"}\n` +
            `- **Chuyên đề cần củng cố:** ${directStats.chuyen_de_yeu_can_cai_thien?.join(", ") || "Không có chuyên đề báo động"}\n\n` +
            `*(Hệ thống đã trích xuất dữ liệu bài thi trực tiếp từ cơ sở dữ liệu).*`;
        } else {
          responseText =
            directStats.message || "Bạn chưa có dữ liệu bài làm để phân tích.";
        }
      } catch {
        responseText =
          "Hệ thống AI hiện đang tạm thời gián đoạn kết nối. Bạn vui lòng thử lại sau ít phút nhé!";
      }
    } else {
      responseText =
        "Hệ thống Trợ lý AI hiện đang tạm thời gián đoạn kết nối hoặc đang bảo trì. Bạn vui lòng thử lại sau ít phút nhé!";
    }
  }

  // 4. Lưu tin nhắn vào MongoDB
  activeConv.messages.push({
    role: "user",
    content: message,
    timestamp: new Date(),
  });

  activeConv.messages.push({
    role: "model",
    content: responseText,
    tool_calls: executedToolCalls.map((t) => ({
      name: t.name,
      args: t.args,
    })),
    timestamp: new Date(),
  });

  await activeConv.save();

  return {
    success: true,
    conversationId: (activeConv._id as mongoose.Types.ObjectId).toString(),
    title: activeConv.title,
    message: responseText,
    toolCalls: executedToolCalls,
  };
}
