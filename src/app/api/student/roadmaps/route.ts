import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import {
  getCompletableRoadmapContents,
  getRoadmapContents,
} from "@/lib/roadmaps";
import { LearningProgress, Order, Roadmap, Subject, User } from "@/models";

export async function GET() {
  const { user, errorResponse } = await checkApiAuthorization(["student"]);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const roadmaps = await Roadmap.find({ is_published: true })
      .select("title description price cover_image teacher_id subject_id contents stages createdAt")
      .sort({ createdAt: -1 })
      .lean();
    if (roadmaps.length === 0) {
      return NextResponse.json({ success: true, roadmaps: [] });
    }

    const roadmapIds = roadmaps.map((roadmap) => roadmap._id);
    const userId = new mongoose.Types.ObjectId(user.id);
    const [progressRows, completedOrders, teachers, subjects] = await Promise.all([
      LearningProgress.find({
        user_id: userId,
        roadmap_id: { $in: roadmapIds },
      })
        .select("roadmap_id completed_content_ids")
        .lean(),
      Order.find({
        user_id: userId,
        roadmap_id: { $in: roadmapIds },
        status: "completed",
      })
        .select("roadmap_id")
        .lean(),
      User.find({
        _id: {
          $in: roadmaps.map((roadmap) => roadmap.teacher_id),
        },
      })
        .select("name")
        .lean(),
      Subject.find({
        _id: { $in: roadmaps.map((roadmap) => roadmap.subject_id) },
      })
        .select("subject_name")
        .lean(),
    ]);

    const progressByRoadmap = new Map(
      progressRows.map((row) => [String(row.roadmap_id), row]),
    );
    const paidRoadmapIds = new Set(
      completedOrders.map((order) => String(order.roadmap_id)),
    );
    const teacherNames = new Map(
      teachers.map((teacher) => [String(teacher._id), teacher.name]),
    );
    const subjectNames = new Map(
      subjects.map((subject) => [String(subject._id), subject.subject_name]),
    );

    return NextResponse.json({
      success: true,
      roadmaps: roadmaps.map((roadmap) => {
        const progress = progressByRoadmap.get(String(roadmap._id));
        const contents = getRoadmapContents(roadmap);
        const contentCount = contents.length;
        const completableContents = getCompletableRoadmapContents(contents);
        const completableIds = new Set(
          completableContents.map((content) => String(content._id)),
        );
        const completedContentCount = new Set(
          (progress?.completed_content_ids || [])
            .map(String)
            .filter((contentId: string) => completableIds.has(contentId)),
        ).size;
        const hasPaidOrder = paidRoadmapIds.has(String(roadmap._id));
        const isEnrolled =
          Boolean(progress) && (roadmap.price === 0 || hasPaidOrder);
        const hasAccess =
          roadmap.price === 0 ? isEnrolled : hasPaidOrder;

        return {
          _id: String(roadmap._id),
          title: roadmap.title,
          description: roadmap.description || "",
          subject_name:
            subjectNames.get(String(roadmap.subject_id)) || "",
          price: roadmap.price,
          cover_image: roadmap.cover_image || "",
          teacher_name:
            teacherNames.get(String(roadmap.teacher_id)) || "Giáo viên",
          content_count: contentCount,
          is_enrolled: isEnrolled,
          has_access: hasAccess,
          can_start: hasAccess && !isEnrolled,
          completion_percentage: progress
            ? completableContents.length > 0
              ? Math.round(
                  (completedContentCount / completableContents.length) * 100,
                )
              : 100
            : 0,
          createdAt: roadmap.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("Lỗi khi tải danh sách lộ trình học viên:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải danh sách lộ trình." },
      { status: 500 },
    );
  }
}
