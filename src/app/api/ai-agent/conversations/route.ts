import { NextResponse } from "next/server";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { AiConversation } from "@/models";
import mongoose from "mongoose";

export async function GET() {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const agentRole = user.role === "student" ? "student" : "teacher";

    const conversations = await AiConversation.find({
      user_id: new mongoose.Types.ObjectId(user.id),
      agent_role: agentRole,
    })
      .select("_id title agent_role context_type context_id updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error: unknown) {
    console.error("Fetch AI conversations error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải danh sách cuộc trò chuyện" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const { title, context_type, context_id } = body;
    const agentRole = user.role === "student" ? "student" : "teacher";

    const newConv = await AiConversation.create({
      user_id: new mongoose.Types.ObjectId(user.id),
      agent_role: agentRole,
      title:
        title?.trim() ||
        (agentRole === "student" ? "Hỏi đáp học tập" : "Trợ lý giảng dạy"),
      context_type: context_type || "general",
      context_id:
        context_id && mongoose.Types.ObjectId.isValid(context_id)
          ? new mongoose.Types.ObjectId(context_id)
          : undefined,
      messages: [],
    });

    return NextResponse.json({
      success: true,
      conversation: newConv,
    });
  } catch (error: unknown) {
    console.error("Create AI conversation error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tạo phiên trò chuyện mới" },
      { status: 500 }
    );
  }
}
