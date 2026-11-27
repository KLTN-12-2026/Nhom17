import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { LearningProgress, Order, Roadmap } from "@/models";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await checkApiAuthorization(["student"]);
  if (errorResponse) return errorResponse;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "ID lộ trình không hợp lệ." }, { status: 400 });
    }
    await connectDB();
    const roadmapId = new mongoose.Types.ObjectId(id);
    const roadmap = await Roadmap.findOne({ _id: roadmapId, is_published: true }).select("title price").lean();
    if (!roadmap) {
      return NextResponse.json({ success: false, message: "Không tìm thấy lộ trình đã xuất bản." }, { status: 404 });
    }

    const userId = new mongoose.Types.ObjectId(user.id);
    const owned = await Order.exists({ user_id: userId, roadmap_id: roadmapId, status: "completed" });
    if (owned) {
      return NextResponse.json(
        { success: false, message: "Bạn đã sở hữu lộ trình này.", redirect_url: `/student/roadmaps/${id}` },
        { status: 409 },
      );
    }

    const free = roadmap.price <= 0;
    const paymentMethod = free ? "free" : "banking";

    let order = await Order.findOne({ user_id: userId, roadmap_id: roadmapId, status: "pending" });
    if (!order) {
      const orderCode = `RD${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
      order = await Order.create({
        user_id: userId,
        roadmap_id: roadmapId,
        order_code: orderCode,
        amount: roadmap.price,
        payment_method: paymentMethod,
        status: free ? "completed" : "pending",
        paid_at: free ? new Date() : null,
      });
    } else if (free) {
      order.amount = 0;
      order.payment_method = "free";
      order.status = "completed";
      order.paid_at = new Date();
      await order.save();
    } else if (order.payment_method !== paymentMethod || order.amount !== roadmap.price) {
      order.payment_method = paymentMethod;
      order.amount = roadmap.price;
      await order.save();
    }

    if (order.status === "completed") {
      await LearningProgress.updateOne(
        { user_id: userId, roadmap_id: roadmapId },
        {
          $setOnInsert: {
            user_id: userId,
            roadmap_id: roadmapId,
            completed_content_ids: [],
            completion_percentage: 0,
            last_activity_at: new Date(),
          },
        },
        { upsert: true },
      );
    }

    return NextResponse.json(
      {
        success: true,
        order_id: String(order._id),
        redirect_url: order.status === "completed" ? `/student/roadmaps/${id}` : `/student/orders/${order._id}`,
      },
      { status: order.status === "completed" ? 201 : 202 },
    );
  } catch (error) {
    console.error("Unable to create MB Bank order", error);
    return NextResponse.json({ success: false, message: "Không thể tạo đơn hàng lúc này." }, { status: 500 });
  }
}
