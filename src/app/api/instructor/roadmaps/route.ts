import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { Roadmap } from "@/models";

const contentSchema = z.object({
  content_type: z.enum(["exam", "practice", "lesson"]).default("lesson"),
  title: z.string().trim().min(1).max(200),
  order: z.coerce.number().int().min(1),
  exam_id: z.string().optional().nullable(),
});
const stageSchema = z.object({
  stage_title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).default(""),
  order: z.coerce.number().int().min(1),
  contents: z.array(contentSchema).default([]),
});
const roadmapSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(3000).default(""),
  price: z.coerce.number().min(0).max(100000000),
  cover_image: z.string().trim().max(2000).default(""),
  is_published: z.boolean().default(false),
  stages: z.array(stageSchema).max(50).default([]),
});

export async function GET() {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;
  try {
    await connectDB();
    const filter = user.role === "admin" ? {} : { teacher_id: new mongoose.Types.ObjectId(user.id) };
    const roadmaps = await Roadmap.find(filter).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ success: true, roadmaps: roadmaps.map((roadmap) => ({ ...roadmap, _id: String(roadmap._id), teacher_id: String(roadmap.teacher_id) })) });
  } catch (error) {
    console.error("Unable to load instructor roadmaps", error);
    return NextResponse.json({ success: false, message: "Không thể tải danh sách lộ trình." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;
  try {
    const input = roadmapSchema.parse(await request.json());
    await connectDB();
    const roadmap = await Roadmap.create({ ...input, teacher_id: new mongoose.Types.ObjectId(user.id) });
    return NextResponse.json({ success: true, message: "Đã tạo lộ trình.", roadmap: { id: String(roadmap._id) } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, message: error.issues[0]?.message || "Dữ liệu lộ trình không hợp lệ." }, { status: 400 });
    console.error("Unable to create roadmap", error);
    return NextResponse.json({ success: false, message: "Không thể tạo lộ trình." }, { status: 500 });
  }
}

export { roadmapSchema };
