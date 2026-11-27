import { NextResponse } from "next/server";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { getRoadmapCatalog } from "@/lib/roadmap-purchases";

export async function GET() { const { user, errorResponse } = await checkApiAuthorization(["student"]); if (errorResponse) return errorResponse; try { return NextResponse.json({ success: true, roadmaps: await getRoadmapCatalog(user.id) }); } catch (error) { console.error(error); return NextResponse.json({ success: false, message: "Không thể tải danh sách lộ trình." }, { status: 500 }); } }
