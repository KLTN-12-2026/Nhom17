import crypto from "crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { completePendingOrder } from "@/lib/sepay";
import { extractOrderCodeFromText } from "@/lib/vietqr";
import { Order } from "@/models";

interface SePayWebhookPayload {
  id?: number | string;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string | null;
  content?: string;
  transferType?: string;
  transferAmount?: number;
  description?: string;
}

function isAuthorizedWebhook(request: Request, expectedKey: string): boolean {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^(?:Apikey|Bearer)\s+(.+)$/i);
  const providedKey = match?.[1]?.trim() || "";
  if (!providedKey || providedKey.length !== expectedKey.length) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(providedKey, "utf8"),
    Buffer.from(expectedKey, "utf8"),
  );
}

export async function POST(request: Request) {
  const expectedKey = process.env.SEPAY_WEBHOOK_API_KEY?.trim() || "";
  if (!expectedKey) {
    return NextResponse.json(
      { success: false, message: "Chưa cấu hình SEPAY_WEBHOOK_API_KEY." },
      { status: 503 },
    );
  }

  if (!isAuthorizedWebhook(request, expectedKey)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized webhook." },
      { status: 401 },
    );
  }

  let payload: SePayWebhookPayload;
  try {
    payload = (await request.json()) as SePayWebhookPayload;
  } catch {
    return NextResponse.json(
      { success: false, message: "Payload không hợp lệ." },
      { status: 400 },
    );
  }

  if (payload.transferType && payload.transferType !== "in") {
    return NextResponse.json({ success: true, ignored: true, reason: "Not incoming transfer" });
  }

  const orderCode =
    extractOrderCodeFromText(payload.code || "") ||
    extractOrderCodeFromText(payload.content || "") ||
    extractOrderCodeFromText(payload.description || "");

  if (!orderCode) {
    return NextResponse.json({ success: true, ignored: true, reason: "Order code not found" });
  }

  try {
    await connectDB();
    const order = await Order.findOne({ order_code: orderCode });
    if (!order) {
      return NextResponse.json({ success: true, ignored: true, reason: "Order not found" });
    }

    if (order.status === "completed") {
      return NextResponse.json({ success: true, already_completed: true });
    }

    if (order.status !== "pending") {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: `Order status is ${order.status}`,
      });
    }

    const receivedAmount = Number(payload.transferAmount || 0);
    if (receivedAmount < order.amount) {
      return NextResponse.json(
        {
          success: false,
          message: `Số tiền nhận được (${receivedAmount}) nhỏ hơn giá trị đơn hàng (${order.amount}).`,
        },
        { status: 400 },
      );
    }

    await completePendingOrder(order);

    return NextResponse.json({ success: true, order_code: order.order_code });
  } catch (error) {
    console.error("SePay webhook error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi xử lý webhook." },
      { status: 500 },
    );
  }
}
