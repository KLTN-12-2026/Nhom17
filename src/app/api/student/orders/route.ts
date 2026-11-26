import { NextResponse } from "next/server";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { getStudentOrders } from "@/lib/roadmap-purchases";
export async function GET() { const { user, errorResponse } = await checkApiAuthorization(["student"]); if (errorResponse) return errorResponse; try { return NextResponse.json({ success: true, orders: await getStudentOrders(user.id) }); } catch (error) { console.error(error); return NextResponse.json({ success: false, message: "Không thể tải đơn hàng." }, { status: 500 }); } }
