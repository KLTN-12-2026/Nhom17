import { connectDB } from "@/lib/db";
import { Topic, Subject } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

/**
 * POST /api/instructor/topics
 * Tạo mới một chuyên đề / chủ đề kiến thức trong môn học (hỗ trợ cây phân cấp đệ quy parent_id)
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { subject_id, parent_id = null, topic_name, description, level } = body;

    if (!subject_id || typeof subject_id !== "string") {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn môn học cho chuyên đề này" },
        { status: 400 }
      );
    }

    if (!topic_name || typeof topic_name !== "string" || !topic_name.trim()) {
      return NextResponse.json(
        { success: false, message: "Tên chuyên đề không được để trống" },
        { status: 400 }
      );
    }

    await connectDB();

    // Kiểm tra môn học có tồn tại
    const subjectExists = await Subject.findById(subject_id);
    if (!subjectExists) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy môn học tương ứng" },
        { status: 404 }
      );
    }

    let resolvedParentId: string | null = null;
    let computedLevel = Number(level) || 1;

    if (parent_id && typeof parent_id === "string" && parent_id.trim()) {
      const parentTopic = await Topic.findById(parent_id.trim());
      if (!parentTopic) {
        return NextResponse.json(
          { success: false, message: "Không tìm thấy chủ đề cha đã chọn" },
          { status: 404 }
        );
      }
      if (String(parentTopic.subject_id) !== String(subject_id)) {
        return NextResponse.json(
          { success: false, message: "Chủ đề cha không thuộc cùng môn học đã chọn" },
          { status: 400 }
        );
      }
      resolvedParentId = String(parentTopic._id);
      computedLevel = (parentTopic.level || 1) + 1;
    }

    const trimmedName = topic_name.trim();
    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Kiểm tra trùng tên chuyên đề cùng cấp trong cùng một môn
    const existing = await Topic.findOne({
      subject_id,
      parent_id: resolvedParentId,
      topic_name: { $regex: new RegExp(`^${escapedName}$`, "i") },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Chuyên đề này đã tồn tại ở cùng cấp trong môn học" },
        { status: 400 }
      );
    }

    const newTopic = await Topic.create({
      subject_id,
      parent_id: resolvedParentId,
      topic_name: trimmedName,
      description: description?.trim() || "",
      level: computedLevel,
      created_by: user?.id,
    });

    return NextResponse.json({
      success: true,
      message: "Tạo chuyên đề mới thành công!",
      topic: newTopic,
    });
  } catch (error) {
    console.error("Lỗi khi tạo chuyên đề:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi tạo chuyên đề" },
      { status: 500 }
    );
  }
}
