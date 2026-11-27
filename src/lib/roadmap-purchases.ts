import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { LearningProgress, Order, Roadmap } from "@/models";
import type { IRoadmap } from "@/models/Roadmap";

export interface RoadmapContentDTO { id: string; content_type: "exam" | "practice" | "lesson"; title: string; order: number; }
export interface RoadmapStageDTO { id: string; stage_title: string; order: number; description: string; contents: RoadmapContentDTO[]; }
export interface RoadmapDTO { id: string; title: string; description: string; price: number; cover_image: string; teacher_name: string; stage_count: number; content_count: number; is_purchased: boolean; completion_percentage: number; completed_content_ids: string[]; stages?: RoadmapStageDTO[]; }

type RoadmapProgressSnapshot = {
  stages: Array<{
    contents: Array<{ _id: mongoose.Types.ObjectId }>;
  }>;
};

function serializeRoadmap(roadmap: IRoadmap & { _id: mongoose.Types.ObjectId; teacher_id?: unknown }, options: { isPurchased: boolean; completionPercentage?: number; completedContentIds?: string[]; includeStages?: boolean }): RoadmapDTO {
  const stages = (roadmap.stages || []).map((stage) => ({ id: String(stage._id || ""), stage_title: stage.stage_title, order: stage.order, description: stage.description || "", contents: (stage.contents || []).map((content) => ({ id: String(content._id || ""), content_type: content.content_type, title: content.title, order: content.order })) }));
  const contentCount = stages.reduce((total, stage) => total + stage.contents.length, 0);
  const teacher = roadmap.teacher_id as { name?: string } | null;
  return { id: String(roadmap._id), title: roadmap.title, description: roadmap.description || "", price: roadmap.price || 0, cover_image: roadmap.cover_image || "", teacher_name: teacher && typeof teacher === "object" ? teacher.name || "Giảng viên" : "Giảng viên", stage_count: stages.length, content_count: contentCount, is_purchased: options.isPurchased, completion_percentage: options.completionPercentage || 0, completed_content_ids: options.completedContentIds || [], ...(options.includeStages ? { stages } : {}) };
}

export async function getRoadmapCatalog(userId: string): Promise<RoadmapDTO[]> {
  await connectDB();
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const [roadmaps, orders, progresses] = await Promise.all([
    Roadmap.find({ is_published: true }).select("title description price cover_image teacher_id stages").populate("teacher_id", "name").sort({ createdAt: -1 }).lean(),
    Order.find({ user_id: userObjectId, status: "completed" }).select("roadmap_id").lean(),
    LearningProgress.find({ user_id: userObjectId }).select("roadmap_id completion_percentage completed_content_ids").lean(),
  ]);
  const purchasedIds = new Set(orders.map((order) => String(order.roadmap_id)));
  const progressByRoadmap = new Map(progresses.map((progress) => [String(progress.roadmap_id), progress]));
  return (roadmaps as unknown as Array<IRoadmap & { _id: mongoose.Types.ObjectId; teacher_id?: unknown }>).map((roadmap) => { const progress = progressByRoadmap.get(String(roadmap._id)); return serializeRoadmap(roadmap, { isPurchased: purchasedIds.has(String(roadmap._id)), completionPercentage: progress?.completion_percentage || 0, completedContentIds: (progress?.completed_content_ids || []).map(String) }); });
}

export async function getRoadmapDetail(roadmapId: string, userId: string): Promise<RoadmapDTO | null> {
  await connectDB();
  const id = new mongoose.Types.ObjectId(roadmapId);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const [roadmap, order, progress] = await Promise.all([
    Roadmap.findOne({ _id: id, is_published: true }).select("title description price cover_image teacher_id stages").populate("teacher_id", "name").lean(),
    Order.findOne({ user_id: userObjectId, roadmap_id: id, status: "completed" }).select("_id").lean(),
    LearningProgress.findOne({ user_id: userObjectId, roadmap_id: id }).select("completion_percentage completed_content_ids").lean(),
  ]);
  if (!roadmap) return null;
  return serializeRoadmap(roadmap as unknown as IRoadmap & { _id: mongoose.Types.ObjectId; teacher_id?: unknown }, { isPurchased: Boolean(order), completionPercentage: progress?.completion_percentage || 0, completedContentIds: (progress?.completed_content_ids || []).map(String), includeStages: true });
}

export async function getStudentOrders(userId: string) {
  await connectDB();
  const orders = await Order.find({ user_id: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 }).lean();
  const roadmaps = await Roadmap.find({ _id: { $in: orders.map((order) => order.roadmap_id) } }).select("title cover_image").lean();
  const map = new Map(roadmaps.map((roadmap) => [String(roadmap._id), roadmap]));
  return orders.map((order) => { const roadmap = map.get(String(order.roadmap_id)); return { id: String(order._id), order_code: order.order_code, roadmap_id: String(order.roadmap_id), roadmap_title: roadmap?.title || "Lộ trình học", amount: order.amount, payment_method: order.payment_method, status: order.status, created_at: order.createdAt.toISOString(), paid_at: order.paid_at?.toISOString() || null }; });
}

export async function getOrderForStudent(orderId: string, userId: string) {
  await connectDB();
  const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), user_id: new mongoose.Types.ObjectId(userId) }).lean();
  if (!order) return null;
  const roadmap = await Roadmap.findById(order.roadmap_id).select("title cover_image").lean();
  return { id: String(order._id), order_code: order.order_code, roadmap_id: String(order.roadmap_id), roadmap_title: roadmap?.title || "Lộ trình học", cover_image: roadmap?.cover_image || "", amount: order.amount, payment_method: order.payment_method, status: order.status, created_at: order.createdAt.toISOString(), paid_at: order.paid_at?.toISOString() || null };
}

export async function updateRoadmapProgress(roadmapId: string, contentId: string, userId: string, completed: boolean) {
  await connectDB();
  const roadmapObjectId = new mongoose.Types.ObjectId(roadmapId);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const [roadmapResult, purchase] = await Promise.all([
    Roadmap.findOne({ _id: roadmapObjectId, is_published: true }).select("stages").lean(),
    Order.findOne({ user_id: userObjectId, roadmap_id: roadmapObjectId, status: "completed" }).select("_id").lean(),
  ]);
  const roadmap = roadmapResult as unknown as RoadmapProgressSnapshot | null;
  if (!roadmap) return { error: "Không tìm thấy lộ trình", status: 404 };
  if (!purchase) return { error: "Bạn cần mua lộ trình trước khi cập nhật tiến độ", status: 403 };
  const contentExists = roadmap.stages.some((stage) => stage.contents.some((content) => String(content._id) === contentId));
  if (!contentExists) return { error: "Nội dung không thuộc lộ trình này", status: 400 };
  const progress = await LearningProgress.findOneAndUpdate(
    { user_id: userObjectId, roadmap_id: roadmapObjectId },
    { $setOnInsert: { user_id: userObjectId, roadmap_id: roadmapObjectId, completed_content_ids: [], completion_percentage: 0 }, $set: { last_activity_at: new Date() } },
    { upsert: true, new: true },
  );
  if (!progress) return { error: "Không thể khởi tạo tiến độ học tập", status: 500 };
  const completedContentIds: unknown[] = Array.isArray(progress.completed_content_ids)
    ? progress.completed_content_ids
    : [];

  const completedIds = new Set<string>(
    completedContentIds.map((id: unknown) => String(id)),
  );
  if (completed) {
    completedIds.add(contentId);
  } else {
    completedIds.delete(contentId);
  }
  const totalContents = roadmap.stages.reduce((sum, stage) => sum + stage.contents.length, 0);
  progress.completed_content_ids = [...completedIds].map((id) => new mongoose.Types.ObjectId(id));
  progress.completion_percentage = totalContents ? Math.round((completedIds.size / totalContents) * 100) : 0;
  progress.last_activity_at = new Date();
  await progress.save();
  return { completion_percentage: progress.completion_percentage, completed_content_ids: [...completedIds] };
}
