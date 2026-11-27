import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { LearningProgress, Order, Roadmap } from "@/models";
import { createVnpayPaymentUrl, isVnpayConfigured } from "@/lib/vnpay";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await checkApiAuthorization(["student"]);
  if (errorResponse) return errorResponse;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: "ID lộ trình không hợp lệ." }, { status: 400 });
    if (!isVnpayConfigured()) return NextResponse.json({ success: false, message: "VNPay chưa được cấu hình. Hãy thiết lập VNPAY_TMN_CODE, VNPAY_HASH_SECRET và VNPAY_RETURN_URL." }, { status: 503 });
    await connectDB();
    const roadmap = await Roadmap.findOne({ _id: new mongoose.Types.ObjectId(id), is_published: true }).select("title price").lean();
    if (!roadmap) return NextResponse.json({ success: false, message: "Không tìm thấy lộ trình đã xuất bản." }, { status: 404 });
    const userId = new mongoose.Types.ObjectId(user.id);
    const owned = await Order.exists({ user_id: userId, roadmap_id: roadmap._id, status: "completed" });
    if (owned) return NextResponse.json({ success: false, message: "Bạn đã sở hữu lộ trình này." }, { status: 409 });

    const orderCode = `RM${Date.now()}${new mongoose.Types.ObjectId().toString().slice(-6).toUpperCase()}`;
    const order = await Order.create({ user_id: userId, roadmap_id: roadmap._id, order_code: orderCode, amount: roadmap.price, payment_method: roadmap.price <= 0 ? "free" : "vnpay", status: roadmap.price <= 0 ? "completed" : "pending", paid_at: roadmap.price <= 0 ? new Date() : null });
    if (roadmap.price <= 0) {
      await LearningProgress.updateOne({ user_id: userId, roadmap_id: roadmap._id }, { $setOnInsert: { user_id: userId, roadmap_id: roadmap._id, completed_content_ids: [], completion_percentage: 0, last_activity_at: new Date() } }, { upsert: true });
      return NextResponse.json({ success: true, redirect_url: `/student/roadmaps/${id}`, order_id: String(order._id) });
    }
    const redirect_url = createVnpayPaymentUrl({ orderCode, amount: roadmap.price, orderInfo: `Thanh toan lo trinh ${orderCode}`, request });
    return NextResponse.json({ success: true, redirect_url, order_id: String(order._id) });
  } catch (error) {
    console.error("Unable to start VNPay payment", error);
    return NextResponse.json({ success: false, message: error instanceof Error && error.message.startsWith("Missing VNPAY_") ? "VNPay chưa được cấu hình đầy đủ." : "Không thể khởi tạo thanh toán VNPay." }, { status: 500 });
  }
}
