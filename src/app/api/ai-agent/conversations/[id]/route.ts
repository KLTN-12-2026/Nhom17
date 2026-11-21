import { NextResponse } from "next/server";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { AiConversation } from "@/models";
import mongoose from "mongoose";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Mã hội thoại không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    const conversation = await AiConversation.findOne({
      _id: new mongoose.Types.ObjectId(id),
      user_id: new mongoose.Types.ObjectId(user.id),
    }).lean();

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phiên hội thoại này" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error: unknown) {
    console.error("Get AI conversation details error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lấy thông tin cuộc trò chuyện" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Mã hội thoại không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    const result = await AiConversation.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      user_id: new mongoose.Types.ObjectId(user.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy cuộc trò chuyện để xóa" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã xóa cuộc trò chuyện",
    });
  } catch (error: unknown) {
    console.error("Delete AI conversation error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể xóa cuộc trò chuyện" },
      { status: 500 }
    );
  }
}
