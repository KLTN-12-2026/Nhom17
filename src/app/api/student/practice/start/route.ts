import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Topic, Question, ExamAttempt } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import mongoose from "mongoose";

/**
 * POST /api/student/practice/start
 * Bốc ngẫu nhiên câu hỏi theo Chuyên đề / Dạng bài từ Ngân hàng câu hỏi
 * Tạo phiên tự luyện mới trong ExamAttempt (chế độ tự do không áp lực)
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { topic_id, question_count = 10, difficulty = "all" } = body;

    if (!topic_id || typeof topic_id !== "string") {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn dạng bài hoặc chuyên đề ôn tập" },
        { status: 400 }
      );
    }

    await connectDB();

    const topic = await Topic.findById(topic_id).lean();
    if (!topic) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy chuyên đề ôn tập đã chọn" },
        { status: 404 }
      );
    }

    // Xây dựng danh sách topic_id cần lọc (bao gồm đệ quy toàn bộ nhánh chuyên đề con cháu)
    const allSubjectTopics = await Topic.find({ subject_id: topic.subject_id })
      .select("_id parent_id")
      .lean();
    const childrenMap = new Map<string, string[]>();
    for (const t of allSubjectTopics) {
      if (t.parent_id) {
        const pId = String(t.parent_id);
        const list = childrenMap.get(pId) || [];
        list.push(String(t._id));
        childrenMap.set(pId, list);
      }
    }

    const branchTopicIds = new Set<string>([String(topic._id)]);
    const queue: string[] = [String(topic._id)];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const kids = childrenMap.get(curr) || [];
      for (const kid of kids) {
        if (!branchTopicIds.has(kid)) {
          branchTopicIds.add(kid);
          queue.push(kid);
        }
      }
    }

    const targetTopicIds: mongoose.Types.ObjectId[] = Array.from(
      branchTopicIds
    ).map((id) => new mongoose.Types.ObjectId(id));

    // Xây dựng query lọc
    const matchQuery: Record<string, unknown> = {
      topic_id: { $in: targetTopicIds },
    };

    if (
      difficulty &&
      difficulty !== "all" &&
      ["easy", "medium", "hard"].includes(difficulty)
    ) {
      matchQuery.difficulty_level = difficulty;
    }

    // Kiểm tra số lượng câu hỏi khả dụng
    const totalAvailable = await Question.countDocuments(matchQuery);
    if (totalAvailable === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chuyên đề này hiện chưa có câu hỏi nào phù hợp trong ngân hàng câu hỏi. Vui lòng chọn dạng bài khác!",
        },
        { status: 400 }
      );
    }

    // Xác định số lượng câu cần bốc
    const sampleSize = Math.max(
      1,
      Math.min(Number(question_count) || 10, totalAvailable)
    );

    // Bốc ngẫu nhiên câu hỏi bằng aggregate $sample
    const sampledQuestions = await Question.aggregate([
      { $match: matchQuery },
      { $sample: { size: sampleSize } },
    ]);

    if (!sampledQuestions || sampledQuestions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Không thể trích xuất câu hỏi từ ngân hàng câu hỏi",
        },
        { status: 500 }
      );
    }

    // Khởi tạo bản ghi ExamAttempt (attempt_type: "practice")
    const attempt = await ExamAttempt.create({
      user_id: new mongoose.Types.ObjectId(user.id),
      topic_id: topic._id,
      practice_title: `Ôn tập: ${topic.topic_name}`,
      attempt_type: "practice",
      room_id: null,
      exam_id: null,
      status: "in_progress",
      start_time: new Date(),
      score: 0,
      total_correct: 0,
      total_wrong: 0,
      duration_seconds: 0,
      answers: sampledQuestions.map((q) => ({
        question_id: q._id,
        selected_option_id: null,
        is_correct: null,
      })),
    });

    return NextResponse.json({
      success: true,
      attempt_id: String(attempt._id),
      topic: {
        _id: String(topic._id),
        topic_name: topic.topic_name,
        level: topic.level,
      },
      total_questions: sampledQuestions.length,
      questions: sampledQuestions.map((q) => ({
        _id: String(q._id),
        content: q.content,
        difficulty_level: q.difficulty_level,
        explanation: q.explanation || "",
        options: (q.options || []).map((opt: { _id: unknown; option_label: string; content: string; is_correct: boolean }) => ({
          _id: String(opt._id),
          option_label: opt.option_label,
          content: opt.content,
          is_correct: Boolean(opt.is_correct),
        })),
      })),
    });
  } catch (error) {
    console.error("Lỗi khi khởi tạo phiên tự luyện:", error);
    return NextResponse.json(
      { success: false, message: "Không thể khởi tạo phiên tự luyện" },
      { status: 500 }
    );
  }
}
