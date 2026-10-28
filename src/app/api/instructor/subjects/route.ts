import { connectDB } from "@/lib/db";
import { Subject, Topic, Question } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

/**
 * GET /api/instructor/subjects
 * Lấy danh sách các môn học và chủ đề kèm số lượng câu hỏi để hiển thị theo dạng Gói/Thư mục
 */
export async function GET() {
  const { errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  await connectDB();

  const subjects = await Subject.find({}).sort({ subject_name: 1 }).lean();
  const topics = await Topic.find({}).sort({ level: 1, topic_name: 1 }).lean();

  // Đếm số lượng câu hỏi theo từng topic_id
  const questionCounts = await Question.aggregate([
    {
      $group: {
        _id: "$topic_id",
        total: { $sum: 1 },
        easy: { $sum: { $cond: [{ $eq: ["$difficulty_level", "easy"] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ["$difficulty_level", "medium"] }, 1, 0] } },
        hard: { $sum: { $cond: [{ $eq: ["$difficulty_level", "hard"] }, 1, 0] } },
      },
    },
  ]);

  const countMap = new Map<string, { total: number; easy: number; medium: number; hard: number }>();
  questionCounts.forEach((c) => {
    if (c._id) {
      countMap.set(String(c._id), {
        total: c.total || 0,
        easy: c.easy || 0,
        medium: c.medium || 0,
        hard: c.hard || 0,
      });
    }
  });

  // Gắn counts vào topics
  const topicsWithCounts = topics.map((t) => {
    const c = countMap.get(String(t._id)) || { total: 0, easy: 0, medium: 0, hard: 0 };
    return {
      ...t,
      questionCount: c.total,
      stats: c,
    };
  });

  // Gắn counts vào subjects
  const subjectsWithCounts = subjects.map((s) => {
    const subTopics = topicsWithCounts.filter((t) => String(t.subject_id) === String(s._id));
    const totalQ = subTopics.reduce((sum, t) => sum + (t.questionCount || 0), 0);
    return {
      ...s,
      topicCount: subTopics.length,
      questionCount: totalQ,
    };
  });

  return NextResponse.json({
    success: true,
    subjects: subjectsWithCounts,
    topics: topicsWithCounts,
  });
}

/**
 * POST /api/instructor/subjects
 * Tạo mới một môn học cho giáo viên
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { subject_name, description } = body;

    if (!subject_name || typeof subject_name !== "string" || !subject_name.trim()) {
      return NextResponse.json(
        { success: false, message: "Tên môn học không được để trống" },
        { status: 400 }
      );
    }

    await connectDB();

    // Kiểm tra trùng tên môn
    const existing = await Subject.findOne({
      subject_name: { $regex: new RegExp(`^${subject_name.trim()}$`, "i") },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Môn học này đã tồn tại trong hệ thống" },
        { status: 400 }
      );
    }

    const newSubject = await Subject.create({
      subject_name: subject_name.trim(),
      description: description?.trim() || "",
      created_by: user?.id,
    });

    return NextResponse.json({
      success: true,
      message: "Tạo môn học mới thành công!",
      subject: newSubject,
    });
  } catch (error) {
    console.error("Lỗi khi tạo môn học:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi tạo môn học" },
      { status: 500 }
    );
  }
}


