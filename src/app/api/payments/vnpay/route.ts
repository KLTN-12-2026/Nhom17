import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models";
import { verifyVnpaySignature } from "@/lib/vnpay";

async function processPayment(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (!verifyVnpaySignature(params)) return { ok: false, code: "97", message: "Invalid signature" };
  const orderCode = params.get("vnp_TxnRef");
  const amount = Number(params.get("vnp_Amount"));
  if (!orderCode || !Number.isSafeInteger(amount) || amount <= 0) return { ok: false, code: "99", message: "Invalid order data" };
  await connectDB();
  const order = await Order.findOne({ order_code: orderCode, payment_method: "vnpay" });
  if (!order) return { ok: false, code: "01", message: "Order not found" };
  if (Math.round(order.amount * 100) !== amount) return { ok: false, code: "04", message: "Invalid amount" };
  if (order.status === "completed") return { ok: true, code: "00", message: "Confirm Success" };
  const paid = params.get("vnp_ResponseCode") === "00" && params.get("vnp_TransactionStatus") === "00";
  order.status = paid ? "completed" : "failed";
  order.paid_at = paid ? new Date() : null;
  await order.save();
  return { ok: true, code: "00", message: "Confirm Success", orderId: String(order._id), paid };
}

export async function GET(request: NextRequest) {
  try {
    const result = await processPayment(request);
    const fallback = new URL("/student/orders", request.url);
    if (!result.ok || !result.orderId) {
      fallback.searchParams.set("payment", "failed");
      return NextResponse.redirect(fallback);
    }
    const destination = new URL(`/student/orders/${result.orderId}`, request.url);
    destination.searchParams.set("payment", result.paid ? "success" : "failed");
    return NextResponse.redirect(destination);
  } catch (error) {
    console.error("VNPay return verification failed", error);
    return NextResponse.redirect(new URL("/student/orders?payment=error", request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await processPayment(request);
    return NextResponse.json({ RspCode: result.code, Message: result.message });
  } catch (error) {
    console.error("VNPay IPN verification failed", error);
    return NextResponse.json({ RspCode: "99", Message: "Unknown error" });
  }
}
