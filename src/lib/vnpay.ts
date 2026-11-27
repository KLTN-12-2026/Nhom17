import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

function canonicalQuery(params: URLSearchParams): string {
  return [...params.entries()]
    .filter(([key]) => key !== "vnp_SecureHash" && key !== "vnp_SecureHashType")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

export function verifyVnpaySignature(params: URLSearchParams): boolean {
  const received = params.get("vnp_SecureHash");
  if (!received) return false;
  const expected = createHmac("sha512", requiredEnv("VNPAY_HASH_SECRET"))
    .update(canonicalQuery(params), "utf8")
    .digest("hex");
  const actualBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createVnpayPaymentUrl(input: { orderCode: string; amount: number; orderInfo: string; request: NextRequest }): string {
  const tmnCode = requiredEnv("VNPAY_TMN_CODE");
  const secret = requiredEnv("VNPAY_HASH_SECRET");
  const returnUrl = requiredEnv("VNPAY_RETURN_URL");
  const paymentUrl = process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now).replaceAll("-", "");
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(now).replaceAll(":", "");
  const params = new URLSearchParams({
    vnp_Version: "2.1.0", vnp_Command: "pay", vnp_TmnCode: tmnCode,
    vnp_Amount: String(Math.round(input.amount * 100)), vnp_CurrCode: "VND",
    vnp_TxnRef: input.orderCode, vnp_OrderInfo: input.orderInfo.slice(0, 255),
    vnp_OrderType: "other", vnp_Locale: "vn", vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: (input.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || input.request.headers.get("x-real-ip") || "127.0.0.1").slice(0, 45),
    vnp_CreateDate: `${date}${time}`,
  });
  const hash = createHmac("sha512", secret).update(canonicalQuery(params), "utf8").digest("hex");
  params.set("vnp_SecureHash", hash);
  return `${paymentUrl}?${params.toString()}`;
}

export function isVnpayConfigured(): boolean {
  return Boolean(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET && process.env.VNPAY_RETURN_URL);
}
