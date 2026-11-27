import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { getRoadmapMaterialFilename } from "@/lib/roadmap-files";
import {
  getCompletableRoadmapContents,
  getRoadmapContents,
} from "@/lib/roadmaps";
import { Exam, LearningProgress, Order, Roadmap, Subject, Topic } from "@/models";

type RouteContext = { params: Promise<{ id: string }> };

const progressUpdateSchema = z.object({
  content_id: z.string().refine(mongoose.Types.ObjectId.isValid, {
    message: "Nội dung lộ trình không hợp lệ.",
  }),
  completed: z.boolean(),
});

export async function GET(_request: Request, { params }: RouteContext) {
  const { user, errorResponse } = await checkApiAuthorization(["student"]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Lộ trình không hợp lệ." },
        { status: 400 },
      );
    }

    await connectDB();
    const roadmap = await Roadmap.findOne({
      _id: id,
      is_published: true,
    }).lean();
    if (!roadmap) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lộ trình đang xuất bản." },
        { status: 404 },
      );
    }

    const userId = new mongoose.Types.ObjectId(user.id);
    const [progress, completedOrder, subject] = await Promise.all([
      LearningProgress.findOne({
        roadmap_id: roadmap._id,
        user_id: userId,
      }).lean(),
      roadmap.price > 0
        ? Order.exists({
            roadmap_id: roadmap._id,
            user_id: userId,
            status: "completed",
          })
        : Promise.resolve(null),
      Subject.findById(roadmap.subject_id).select("subject_name").lean(),
    ]);

    if (roadmap.price === 0 && !progress) {
      return NextResponse.json(
        {
          success: false,
          code: "ENROLLMENT_REQUIRED",
          message: "Đăng ký lộ trình miễn phí để xem nội dung học.",
          roadmap: {
            _id: String(roadmap._id),
            title: roadmap.title,
            price: roadmap.price,
            cover_image: roadmap.cover_image || "",
          },
        },
        { status: 403 },
      );
    }
    if (roadmap.price > 0 && !completedOrder) {
      return NextResponse.json(
        {
          success: false,
          code: "PAYMENT_REQUIRED",
          message: "Cần có đơn hàng thanh toán thành công để mở nội dung lộ trình.",
          roadmap: {
            _id: String(roadmap._id),
            title: roadmap.title,
            price: roadmap.price,
            cover_image: roadmap.cover_image || "",
          },
        },
        { status: 403 },
      );
    }

    const roadmapContents = getRoadmapContents(roadmap);
    const examIds = roadmapContents
      .filter((content) => content.content_type === "exam" && content.exam_id)
      .map((content) => content.exam_id);
    const topicIds = roadmapContents
      .filter((content) => content.topic_id)
      .map((content) => content.topic_id);
    const [exams, topics] = await Promise.all([
      examIds.length
        ? Exam.find({ _id: { $in: examIds }, is_published: true })
            .select("title")
            .lean()
        : Promise.resolve([]),
      topicIds.length
        ? Topic.find({ _id: { $in: topicIds } })
            .select("topic_name")
            .lean()
        : Promise.resolve([]),
    ]);
    const examNames = new Map(
      exams.map((exam) => [String(exam._id), exam.title]),
    );
    const topicNames = new Map(
      topics.map((topic) => [String(topic._id), topic.topic_name]),
    );
    const completableContents =
      getCompletableRoadmapContents(roadmapContents);
    const completableContentIds = new Set(
      completableContents.map((content) => String(content._id)),
    );
    const completedContentIds = new Set(
      (progress?.completed_content_ids || [])
        .map(String)
        .filter((contentId: string) => completableContentIds.has(contentId)),
    );
    const progressContentCount = completableContents.length;
    const completedContentCount = completedContentIds.size;
    const completionPercentage =
      progressContentCount > 0
        ? Math.round((completedContentCount / progressContentCount) * 100)
        : 100;

    const contents = roadmapContents.map((content) => ({
        _id: String(content._id),
        content_type: content.content_type,
        title: content.title,
        order: content.order,
        exam_id: content.exam_id ? String(content.exam_id) : null,
        topic_id: content.topic_id ? String(content.topic_id) : null,
        topic_name: content.topic_id
          ? topicNames.get(String(content.topic_id)) || ""
          : "",
        exam_name: content.exam_id
          ? examNames.get(String(content.exam_id)) || content.title
          : "",
        resource_url:
          content.content_type !== "lesson"
            ? ""
            : getRoadmapMaterialFilename(content.resource_url || "")
              ? `/api/student/roadmaps/${roadmap._id}/materials/${content._id}`
              : content.resource_url || "",
        file_name:
          content.content_type === "lesson" ? content.file_name || "" : "",
        completed:
          content.content_type !== "lesson" &&
          completedContentIds.has(String(content._id)),
      }));

    return NextResponse.json({
      success: true,
      roadmap: {
        _id: String(roadmap._id),
        title: roadmap.title,
        subject_id: String(roadmap.subject_id),
        subject_name: subject?.subject_name || "",
        description: roadmap.description || "",
        price: roadmap.price,
        cover_image: roadmap.cover_image || "",
        contents,
        content_count: contents.length,
        progress_content_count: progressContentCount,
        completion_percentage: completionPercentage,
      },
    });
  } catch (error) {
    console.error("Lỗi khi tải nội dung lộ trình học viên:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải nội dung lộ trình." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { user, errorResponse } = await checkApiAuthorization(["student"]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Lộ trình không hợp lệ." },
        { status: 400 },
      );
    }
    const body: unknown = await request.json();
    const parsedBody = progressUpdateSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            parsedBody.error.issues[0]?.message ||
            "Thông tin cập nhật tiến độ không hợp lệ.",
        },
        { status: 400 },
      );
    }
    const { content_id, completed } = parsedBody.data;

    await connectDB();
    const roadmap = await Roadmap.findOne({
      _id: id,
      is_published: true,
    }).lean();
    if (!roadmap) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lộ trình đang xuất bản." },
        { status: 404 },
      );
    }

    const userId = new mongoose.Types.ObjectId(user.id);
    const [progress, completedOrder] = await Promise.all([
      LearningProgress.findOne({
        roadmap_id: roadmap._id,
        user_id: userId,
      }),
      roadmap.price > 0
        ? Order.exists({
            roadmap_id: roadmap._id,
            user_id: userId,
            status: "completed",
          })
        : Promise.resolve(null),
    ]);
    if (
      (roadmap.price === 0 && !progress) ||
      (roadmap.price > 0 && !completedOrder)
    ) {
      return NextResponse.json(
        { success: false, message: "Bạn chưa có quyền truy cập lộ trình này." },
        { status: 403 },
      );
    }

    const roadmapContents = getRoadmapContents(roadmap);
    const content = roadmapContents.find(
      (item) => String(item._id) === content_id,
    );
    if (!content) {
      return NextResponse.json(
        { success: false, message: "Nội dung không thuộc lộ trình này." },
        { status: 404 },
      );
    }
    if (content.content_type === "lesson") {
      return NextResponse.json(
        { success: false, message: "Tài liệu không cần đánh dấu hoàn thành." },
        { status: 400 },
      );
    }

    const progressRecord =
      progress ||
      (await LearningProgress.create({
        user_id: userId,
        roadmap_id: roadmap._id,
      }));
    const completableContents =
      getCompletableRoadmapContents(roadmapContents);
    const completableContentIds = new Set(
      completableContents.map((item) => String(item._id)),
    );
    const completedIds = new Set<string>(
      Array.from(progressRecord.completed_content_ids, String).filter((id) =>
        completableContentIds.has(id),
      ),
    );
    if (completed) {
      completedIds.add(content_id);
    } else {
      completedIds.delete(content_id);
    }
    progressRecord.completed_content_ids = Array.from(completedIds).map(
      (contentId) => new mongoose.Types.ObjectId(contentId),
    );
    const contentCount = completableContents.length;
    progressRecord.completion_percentage =
      contentCount > 0
        ? Math.round((completedIds.size / contentCount) * 100)
        : 100;
    progressRecord.last_activity_at = new Date();
    await progressRecord.save();

    return NextResponse.json({
      success: true,
      completion_percentage: progressRecord.completion_percentage,
      completed_content_ids: progressRecord.completed_content_ids.map(String),
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Nội dung gửi lên không phải JSON hợp lệ." },
        { status: 400 },
      );
    }
    console.error("Lỗi khi cập nhật tiến độ lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật tiến độ lộ trình." },
      { status: 500 },
    );
  }
}
