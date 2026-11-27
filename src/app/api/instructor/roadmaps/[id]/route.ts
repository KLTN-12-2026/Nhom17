import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { Order, Roadmap } from "@/models";

const contentSchema = z.object({ content_type: z.enum(["exam", "practice", "lesson"]).default("lesson"), title: z.string().trim().min(1).max(200), order: z.coerce.number().int().min(1), exam_id: z.string().optional().nullable() });
const stageSchema = z.object({ stage_title: z.string().trim().min(1).max(150), description: z.string().trim().max(1000).default(""), order: z.coerce.number().int().min(1), contents: z.array(contentSchema).default([]) });
const roadmapSchema = z.object({ title: z.string().trim().min(3).max(200), description: z.string().trim().max(3000).default(""), price: z.coerce.number().min(0).max(100000000), cover_image: z.string().trim().max(2000).default(""), is_published: z.boolean().default(false), stages: z.array(stageSchema).max(50).default([]) });

async function getOwnedRoadmap(id: string, userId: string, role: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Roadmap.findOne({ _id: new mongoose.Types.ObjectId(id), ...(role === "admin" ? {} : { teacher_id: new mongoose.Types.ObjectId(userId) }) });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;
  try {
    const { id } = await params;
    await connectDB();
    const roadmap = await getOwnedRoadmap(id, user.id, user.role);
    if (!roadmap) return NextResponse.json({ success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền quản lý." }, { status: 404 });
    const input = roadmapSchema.parse(await request.json());
    roadmap.set(input);
    await roadmap.save();
    return NextResponse.json({ success: true, message: input.is_published ? "Đã xuất bản lộ trình." : "Đã lưu bản nháp." });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, message: error.issues[0]?.message || "Dữ liệu lộ trình không hợp lệ." }, { status: 400 });
    console.error("Unable to update roadmap", error);
    return NextResponse.json({ success: false, message: "Không thể cập nhật lộ trình." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: "ID lộ trình không hợp lệ." }, { status: 400 });
    await connectDB();
    const roadmap = await getOwnedRoadmap(id, user.id, user.role);
    if (!roadmap) return NextResponse.json({ success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền quản lý." }, { status: 404 });
    const hasOrders = await Order.exists({ roadmap_id: roadmap._id });
    if (hasOrders) return NextResponse.json({ success: false, message: "Không thể xóa lộ trình đã phát sinh đơn hàng." }, { status: 409 });
    await roadmap.deleteOne();
    return NextResponse.json({ success: true, message: "Đã xóa lộ trình." });
  } catch (error) {
    console.error("Unable to delete roadmap", error);
    return NextResponse.json({ success: false, message: "Không thể xóa lộ trình." }, { status: 500 });
  }
}
