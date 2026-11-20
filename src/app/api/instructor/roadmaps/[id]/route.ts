import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import {
  roadmapInputSchema,
  toRoadmapContents,
  validateRoadmapReferences,
} from "@/lib/roadmaps";
import { LearningProgress, Order, Roadmap } from "@/models";

type RouteContext = { params: Promise<{ id: string }> };

async function findRoadmap(id: string, userId: string, isAdmin: boolean) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const filter: Record<string, unknown> = { _id: id };
  if (!isAdmin) filter.teacher_id = userId;
  return Roadmap.findOne(filter);
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID lộ trình không hợp lệ." },
        { status: 400 },
      );
    }
    const body: unknown = await request.json();
    const parsed = roadmapInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu lộ trình không hợp lệ" },
        { status: 400 },
      );
    }

    await connectDB();
    const roadmap = await findRoadmap(id, user.id, user.role === "admin");
    if (!roadmap) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền chỉnh sửa." },
        { status: 404 },
      );
    }

    const referenceError = await validateRoadmapReferences(
      parsed.data.contents,
      user,
      parsed.data.is_published,
      parsed.data.subject_id,
    );
    if (referenceError) {
      return NextResponse.json(
        { success: false, message: referenceError },
        { status: 400 },
      );
    }

    roadmap.title = parsed.data.title;
    roadmap.subject_id = new mongoose.Types.ObjectId(parsed.data.subject_id);
    roadmap.description = parsed.data.description;
    roadmap.price = parsed.data.price;
    roadmap.cover_image = parsed.data.cover_image;
    roadmap.is_published = parsed.data.is_published;
    roadmap.contents = toRoadmapContents(parsed.data.contents);
    roadmap.stages = [];
    await roadmap.save();
    const roadmapData = roadmap.toObject();
    delete roadmapData.stages;

    return NextResponse.json({
      success: true,
      roadmap: roadmapData,
      message: "Đã cập nhật lộ trình.",
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Nội dung gửi lên không phải JSON hợp lệ." },
        { status: 400 },
      );
    }
    console.error("Lỗi khi cập nhật lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật lộ trình." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID lộ trình không hợp lệ." },
        { status: 400 },
      );
    }

    await connectDB();
    const roadmap = await findRoadmap(id, user.id, user.role === "admin");
    if (!roadmap) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền xóa." },
        { status: 404 },
      );
    }

    const [learnerCount, orderCount] = await Promise.all([
      LearningProgress.countDocuments({ roadmap_id: roadmap._id }),
      Order.countDocuments({ roadmap_id: roadmap._id }),
    ]);
    if (learnerCount > 0 || orderCount > 0) {
      return NextResponse.json(
        { success: false, message: "Không thể xóa lộ trình đã có học viên hoặc đơn hàng. Hãy chuyển lộ trình sang bản nháp." },
        { status: 409 },
      );
    }

    await roadmap.deleteOne();
    return NextResponse.json({ success: true, message: "Đã xóa lộ trình." });
  } catch (error) {
    console.error("Lỗi khi xóa lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể xóa lộ trình." },
      { status: 500 },
    );
  }
}
