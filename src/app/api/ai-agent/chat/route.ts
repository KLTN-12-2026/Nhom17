import { NextResponse } from "next/server";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { runAgentConversation } from "@/lib/ai-agent/agent-orchestrator";
import mongoose from "mongoose";

export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { message, conversation_id, context_type, context_id } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Nội dung câu hỏi không được để trống" },
        { status: 400 }
      );
    }

    if (conversation_id && !mongoose.Types.ObjectId.isValid(conversation_id)) {
      return NextResponse.json(
        { success: false, message: "Mã hội thoại không hợp lệ" },
        { status: 400 }
      );
    }

    const result = await runAgentConversation({
      userId: user.id,
      userRole: user.role,
      message: message.trim(),
      conversationId: conversation_id,
      contextType: context_type,
      contextId: context_id,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("AI Agent chat API error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "Hệ thống AI hiện đang tạm thời gián đoạn. Bạn vui lòng thử lại sau ít phút nhé!",
      },
      { status: 500 }
    );
  }
}
