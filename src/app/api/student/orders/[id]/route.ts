import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { getOrderForStudent } from "@/lib/roadmap-purchases";
import { syncPendingOrderFromSePay } from "@/lib/sepay";
import { buildVietQrInfo } from "@/lib/vietqr";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await checkApiAuthorization(["student"]);
  if (errorResponse) return errorResponse;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Mã đơn hàng không hợp lệ." }, { status: 400 });
  }
  try {
    let order = await getOrderForStudent(id, user.id);
    if (!order) return NextResponse.json({ success: false, message: "Không tìm thấy đơn hàng." }, { status: 404 });

    let sepaySyncEnabled = Boolean(process.env.SEPAY_API_TOKEN?.trim());
    if (order.status === "pending" && sepaySyncEnabled) {
      const syncResult = await syncPendingOrderFromSePay(order.id);
      sepaySyncEnabled = syncResult.configured;
      if (syncResult.synced) {
        const refreshed = await getOrderForStudent(id, user.id);
        if (refreshed) order = refreshed;
      }
    }

    const vietqr =
      order.status === "pending"
        ? buildVietQrInfo({ amount: order.amount, orderCode: order.order_code })
        : null;
    return NextResponse.json({
      success: true,
      order,
      vietqr,
      sepay_sync_enabled: sepaySyncEnabled,
      demo_payment_enabled: false,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Không thể tải đơn hàng." }, { status: 500 });
  }
}
