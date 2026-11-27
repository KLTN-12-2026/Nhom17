import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { LearningProgress, Order, Roadmap } from "@/models";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const { user, errorResponse } = await checkApiAuthorization(["student"]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Lộ trình không hợp lệ." },
        { status: 400 },
      );
    }

    await connectDB();
    const roadmap = await Roadmap.findOne({
      _id: id,
      is_published: true,
    })
      .select("_id price")
      .lean();
    if (!roadmap) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lộ trình đang xuất bản." },
        { status: 404 },
      );
    }

    const userId = new mongoose.Types.ObjectId(user.id);
    if (roadmap.price > 0) {
      const completedOrder = await Order.exists({
        roadmap_id: roadmap._id,
        user_id: userId,
        status: "completed",
      });
      if (!completedOrder) {
        return NextResponse.json(
          {
            success: false,
            code: "PAYMENT_REQUIRED",
            message: "Lộ trình có thu phí. Hãy hoàn tất thanh toán trước khi tham gia.",
          },
          { status: 403 },
        );
      }
    }

    const progress = await LearningProgress.findOneAndUpdate(
      { user_id: userId, roadmap_id: roadmap._id },
      {
        $setOnInsert: {
          user_id: userId,
          roadmap_id: roadmap._id,
          completion_percentage: 0,
          completed_content_ids: [],
        },
        $set: { last_activity_at: new Date() },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({
      success: true,
      message: "Đã thêm lộ trình vào mục đang học.",
      completion_percentage: progress.completion_percentage,
    });
  } catch (error) {
    console.error("Lỗi khi tham gia lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tham gia lộ trình." },
      { status: 500 },
    );
  }
}
