import mongoose from "mongoose";
import { Exam, LearningProgress, Order, Roadmap } from "@/models";
import { getRoadmapContents } from "@/lib/roadmaps";

export async function getAccessibleRoadmapExam(
  roadmapId: string,
  examId: string,
  userId: string,
) {
  if (
    !mongoose.Types.ObjectId.isValid(roadmapId) ||
    !mongoose.Types.ObjectId.isValid(examId)
  ) {
    return {
      error: { status: 400, message: "Lộ trình hoặc đề thi không hợp lệ." },
    } as const;
  }

  const roadmap = await Roadmap.findOne({
    _id: roadmapId,
    is_published: true,
  }).lean();
  if (
    !roadmap ||
    !getRoadmapContents(roadmap).some(
      (content) =>
        content.content_type === "exam" &&
        String(content.exam_id) === examId,
    )
  ) {
    return {
      error: { status: 404, message: "Không tìm thấy đề thi trong lộ trình." },
    } as const;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const [progress, completedOrder] = await Promise.all([
    roadmap.price === 0
      ? LearningProgress.exists({
          roadmap_id: roadmap._id,
          user_id: userObjectId,
        })
      : Promise.resolve(null),
    roadmap.price > 0
      ? Order.exists({
          roadmap_id: roadmap._id,
          user_id: userObjectId,
          status: "completed",
        })
      : Promise.resolve(null),
  ]);
  if (
    (roadmap.price === 0 && !progress) ||
    (roadmap.price > 0 && !completedOrder)
  ) {
    return {
      error: {
        status: 403,
        message: "Bạn chưa có quyền truy cập đề thi trong lộ trình này.",
      },
    } as const;
  }

  const exam = await Exam.findOne({
    _id: examId,
    is_published: true,
  }).lean();
  if (!exam) {
    return {
      error: { status: 404, message: "Đề thi không tồn tại hoặc chưa xuất bản." },
    } as const;
  }

  return { roadmap, exam } as const;
}
