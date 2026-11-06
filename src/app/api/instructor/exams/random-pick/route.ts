import { connectDB } from "@/lib/db";
import { Question, Topic } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

/**
 * POST /api/instructor/exams/random-pick
 * Bốc ngẫu nhiên câu hỏi từ ngân hàng môn học đã chọn theo chuyên đề và ma trận độ khó (Dễ/Vừa/Khó)
 */
export async function POST(request: Request) {
  const { errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const body = await request.json();
    const {
      subject_id,
      topic_id,
      easy_count = 0,
      medium_count = 0,
      hard_count = 0,
      exclude_ids = [],
    } = body;

    const easyNum = Math.max(0, parseInt(easy_count, 10) || 0);
    const mediumNum = Math.max(0, parseInt(medium_count, 10) || 0);
    const hardNum = Math.max(0, parseInt(hard_count, 10) || 0);

    const totalToPick = easyNum + mediumNum + hardNum;
    if (totalToPick <= 0) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập số lượng câu hỏi cần bốc lớn hơn 0" },
        { status: 400 },
      );
    }

    if (!subject_id || !mongoose.Types.ObjectId.isValid(subject_id)) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn ngân hàng môn học hợp lệ trước khi bốc câu hỏi" },
        { status: 400 },
      );
    }

    // Xác định danh sách topic_id cần lọc (trong môn học đã chọn, bao gồm cả các chuyên đề con)
    let targetTopicIds: mongoose.Types.ObjectId[] = [];
    if (topic_id && mongoose.Types.ObjectId.isValid(topic_id)) {
      const allSubjectTopics = await Topic.find({ subject_id }).lean();
      const descendantIds = new Set<string>([String(topic_id)]);
      let added = true;
      while (added) {
        added = false;
        for (const t of allSubjectTopics) {
          const pid = t.parent_id ? String(t.parent_id) : null;
          if (pid && descendantIds.has(pid) && !descendantIds.has(String(t._id))) {
            descendantIds.add(String(t._id));
            added = true;
          }
        }
      }
      targetTopicIds = Array.from(descendantIds).map((id) => new mongoose.Types.ObjectId(id));
    } else {
      const topics = await Topic.find({ subject_id }).select("_id").lean();
      targetTopicIds = topics.map((t) => t._id as mongoose.Types.ObjectId);
    }

    const excludedObjectIds = (exclude_ids || [])
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    // Hàm bốc ngẫu nhiên theo từng độ khó
    async function pickByDifficulty(difficulty: "easy" | "medium" | "hard", count: number) {
      if (count <= 0) return [];

      const matchStage: Record<string, unknown> = {
        difficulty_level: difficulty,
      };

      if (targetTopicIds.length > 0) {
        matchStage.topic_id = { $in: targetTopicIds };
      }

      if (excludedObjectIds.length > 0) {
        matchStage._id = { $nin: excludedObjectIds };
      }

      const sampled = await Question.aggregate([
        { $match: matchStage },
        { $sample: { size: count } },
      ]);

      return sampled;
    }

    const [easyQuestions, mediumQuestions, hardQuestions] = await Promise.all([
      pickByDifficulty("easy", easyNum),
      pickByDifficulty("medium", mediumNum),
      pickByDifficulty("hard", hardNum),
    ]);

    const allPicked = [...easyQuestions, ...mediumQuestions, ...hardQuestions];

    // Populate thông tin chuyên đề cho từng câu hỏi
    const topicIdsInPicked = Array.from(new Set(allPicked.map((q) => String(q.topic_id))));
    const topicsInfo = await Topic.find({ _id: { $in: topicIdsInPicked } })
      .select("topic_name subject_id")
      .populate("subject_id", "subject_name")
      .lean();

    const topicMap = new Map(topicsInfo.map((t) => [String(t._id), t]));

    const populatedQuestions = allPicked.map((q) => ({
      ...q,
      topic_id: topicMap.get(String(q.topic_id)) || { topic_name: "Chung" },
    }));

    return NextResponse.json({
      success: true,
      picked_count: populatedQuestions.length,
      requested_counts: { easy: easyNum, medium: mediumNum, hard: hardNum },
      actual_counts: {
        easy: easyQuestions.length,
        medium: mediumQuestions.length,
        hard: hardQuestions.length,
      },
      questions: populatedQuestions,
    });
  } catch (error) {
    console.error("Lỗi khi bốc ngẫu nhiên câu hỏi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể bốc ngẫu nhiên câu hỏi từ ngân hàng" },
      { status: 500 },
    );
  }
}
