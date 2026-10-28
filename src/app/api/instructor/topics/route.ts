import { connectDB } from "@/lib/db";
import { Topic, Subject } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

/**
 * POST /api/instructor/topics
 * Tạo mới một gói chuyên đề trong môn học
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { subject_id, topic_name, description, level = 1 } = body;

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

    // Kiểm tra trùng tên chuyên đề trong cùng một môn
    const existing = await Topic.findOne({
      subject_id,
      topic_name: { $regex: new RegExp(`^${topic_name.trim()}$`, "i") },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Chuyên đề này đã tồn tại trong môn học" },
        { status: 400 }
      );
    }

    const newTopic = await Topic.create({
      subject_id,
      topic_name: topic_name.trim(),
      description: description?.trim() || "",
      level: Number(level) || 1,
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
