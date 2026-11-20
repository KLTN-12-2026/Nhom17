import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { getRoadmapContents, validateRoadmapReferences } from "@/lib/roadmaps";
import { Roadmap } from "@/models";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
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
    const parsedBody = z
      .object({ is_published: z.boolean() })
      .safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, message: "Trạng thái xuất bản không hợp lệ." },
        { status: 400 },
      );
    }
    const isPublished = parsedBody.data.is_published;

    await connectDB();
    const filter: Record<string, unknown> = { _id: id };
    if (user.role !== "admin") filter.teacher_id = user.id;
    const roadmap = await Roadmap.findOne(filter);
    if (!roadmap) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền cập nhật." },
        { status: 404 },
      );
    }

    if (isPublished) {
      const contents = getRoadmapContents(roadmap);
      const validationError = await validateRoadmapReferences(
        contents.map((content) => ({
          _id: content._id ? String(content._id) : undefined,
          content_type: content.content_type,
          title: content.title,
          order: content.order,
          exam_id: content.exam_id ? String(content.exam_id) : undefined,
          topic_id: content.topic_id ? String(content.topic_id) : undefined,
          resource_url: content.resource_url || "",
          file_name: content.file_name || "",
        })),
        user,
        true,
        String(roadmap.subject_id),
      );
      if (validationError) {
        return NextResponse.json(
          { success: false, message: validationError },
          { status: 400 },
        );
      }
    }

    const updateResult = await Roadmap.updateOne(filter, {
      $set: { is_published: isPublished },
    });
    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền cập nhật." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      is_published: isPublished,
      message: isPublished ? "Đã xuất bản lộ trình." : "Đã chuyển lộ trình về bản nháp.",
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Nội dung gửi lên không phải JSON hợp lệ." },
        { status: 400 },
      );
    }
    console.error("Lỗi khi cập nhật trạng thái lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật trạng thái lộ trình." },
      { status: 500 },
    );
  }
}
