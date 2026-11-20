import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import {
  getRoadmapContents,
  roadmapInputSchema,
  toRoadmapContents,
  validateRoadmapReferences,
} from "@/lib/roadmaps";
import { LearningProgress, Roadmap, Subject } from "@/models";

export async function GET() {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const filter =
      user.role === "admin"
        ? {}
        : { teacher_id: new mongoose.Types.ObjectId(user.id) };
    const roadmaps = await Roadmap.find(filter).sort({ updatedAt: -1 }).lean();
    const roadmapIds = roadmaps.map((roadmap) => roadmap._id);
    const [progressCounts, subjects] = await Promise.all([
      roadmapIds.length
        ? LearningProgress.aggregate([
            { $match: { roadmap_id: { $in: roadmapIds } } },
            { $group: { _id: "$roadmap_id", total: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      Subject.find({ _id: { $in: roadmaps.map((roadmap) => roadmap.subject_id) } })
        .select("subject_name")
        .lean(),
    ]);
    const countByRoadmap = new Map(
      progressCounts.map((item) => [String(item._id), item.total]),
    );
    const subjectNames = new Map(
      subjects.map((subject) => [String(subject._id), subject.subject_name]),
    );

    return NextResponse.json({
      success: true,
      roadmaps: roadmaps.map((roadmap) => {
        const contents = getRoadmapContents(roadmap);
        return {
          _id: String(roadmap._id),
          title: roadmap.title,
          description: roadmap.description || "",
          price: roadmap.price,
          cover_image: roadmap.cover_image || "",
          is_published: roadmap.is_published,
          subject_id: roadmap.subject_id ? String(roadmap.subject_id) : "",
          subject_name: subjectNames.get(String(roadmap.subject_id)) || "",
          contents,
          learner_count: countByRoadmap.get(String(roadmap._id)) || 0,
          content_count: contents.length,
        };
      }),
    });
  } catch (error) {
    console.error("Lỗi khi tải danh sách lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải danh sách lộ trình" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const body: unknown = await request.json();
    const parsed = roadmapInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu lộ trình không hợp lệ" },
        { status: 400 },
      );
    }

    await connectDB();
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

    const roadmap = await Roadmap.create({
      ...parsed.data,
      teacher_id: new mongoose.Types.ObjectId(user.id),
      contents: toRoadmapContents(parsed.data.contents),
      stages: [],
    });
    const roadmapData = roadmap.toObject();
    delete roadmapData.stages;

    return NextResponse.json(
      { success: true, roadmap: roadmapData, message: "Đã tạo lộ trình." },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Nội dung gửi lên không phải JSON hợp lệ." },
        { status: 400 },
      );
    }
    console.error("Lỗi khi tạo lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tạo lộ trình. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
