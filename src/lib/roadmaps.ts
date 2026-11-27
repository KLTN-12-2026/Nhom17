import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedUser } from "@/lib/auth-guards";
import { Exam, Subject, Topic } from "@/models";
import type { IRoadmapContent, ILegacyRoadmapStage } from "@/models/Roadmap";

const objectIdSchema = z.string().refine(mongoose.Types.ObjectId.isValid, {
  message: "ID tài liệu không hợp lệ",
});

const contentSchema = z
  .object({
    _id: objectIdSchema.optional(),
    content_type: z.enum(["exam", "practice", "lesson"]),
    title: z.string().trim().min(1, "Tên nội dung không được để trống").max(200),
    order: z.coerce.number().int().min(1),
    exam_id: objectIdSchema.optional(),
    topic_id: objectIdSchema.optional(),
    file_name: z.string().trim().max(255).optional().default(""),
    resource_url: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (value) => !value || value.startsWith("/") || /^https?:\/\//i.test(value),
        "Đường dẫn tài liệu phải là URL http(s) hoặc đường dẫn nội bộ",
      )
      .optional()
      .default(""),
  })
  .superRefine((content, context) => {
    if (content.content_type === "exam" && !content.exam_id) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng chọn đề thi cho nội dung này",
        path: ["exam_id"],
      });
    }
    if (content.content_type === "practice" && !content.topic_id) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng chọn chuyên đề tự luyện",
        path: ["topic_id"],
      });
    }
    if (
      content.content_type === "lesson" &&
      !content.topic_id &&
      !content.resource_url
    ) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng chọn bài học hoặc thêm đường dẫn tài liệu",
        path: ["topic_id"],
      });
    }
  });

const legacyStageSchema = z.object({
  _id: objectIdSchema.optional(),
  stage_title: z.string().trim().min(1, "Tên giai đoạn không được để trống").max(150),
  order: z.coerce.number().int().min(1),
  description: z.string().trim().max(2000).optional().default(""),
  contents: z.array(contentSchema).default([]),
});

const roadmapInputBaseSchema = z.object({
  subject_id: objectIdSchema,
  title: z.string().trim().min(3, "Tên lộ trình phải có ít nhất 3 ký tự").max(200),
  description: z.string().trim().max(5000).optional().default(""),
  price: z.coerce.number().min(0, "Giá lộ trình không thể âm").max(1_000_000_000),
  cover_image: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (value) => !value || value.startsWith("/") || /^https?:\/\//i.test(value),
      "Ảnh bìa phải là URL http(s) hoặc đường dẫn nội bộ",
    )
    .optional()
    .default(""),
  is_published: z.boolean().optional().default(false),
  contents: z.array(contentSchema).optional(),
  stages: z.array(legacyStageSchema).optional(),
});

export const roadmapInputSchema = roadmapInputBaseSchema.transform(
  ({ stages = [], contents, ...roadmap }) => ({
    ...roadmap,
    contents:
      contents ??
      stages
        .sort((left, right) => left.order - right.order)
        .flatMap((stage) =>
          [...stage.contents]
            .sort((left, right) => left.order - right.order)
            .map((content) => ({ ...content })),
        )
        .map((content, index) => ({ ...content, order: index + 1 })),
  }),
);

export type RoadmapInput = z.infer<typeof roadmapInputSchema>;

export function getRoadmapContents(roadmap: {
  contents?: IRoadmapContent[];
  stages?: ILegacyRoadmapStage[];
}) {
  if (roadmap.contents?.length) {
    return [...roadmap.contents].sort((left, right) => left.order - right.order);
  }
  if (!roadmap.stages?.length) {
    return [];
  }

  return [...roadmap.stages]
    .sort((left, right) => left.order - right.order)
    .flatMap((stage) =>
      [...stage.contents]
        .sort((left, right) => left.order - right.order)
        .map((content) => ({ ...content })),
    )
    .map((content, index) => ({ ...content, order: index + 1 }));
}

export function getCompletableRoadmapContents(contents: IRoadmapContent[]) {
  return contents.filter((content) => content.content_type !== "lesson");
}

export function toRoadmapContents(contents: RoadmapInput["contents"]) {
  return contents.map((content) => ({
    ...(content._id ? { _id: new mongoose.Types.ObjectId(content._id) } : {}),
    content_type: content.content_type,
    title: content.title,
    order: content.order,
    exam_id: content.exam_id
      ? new mongoose.Types.ObjectId(content.exam_id)
      : null,
    topic_id: content.topic_id
      ? new mongoose.Types.ObjectId(content.topic_id)
      : null,
    resource_url: content.resource_url,
    file_name: content.file_name,
  }));
}

export async function validateRoadmapReferences(
  contents: RoadmapInput["contents"],
  user: AuthenticatedUser,
  requirePublishable: boolean,
  subjectId: string,
): Promise<string | null> {
  const subjectExists = await Subject.exists({ _id: subjectId });
  if (!subjectExists) {
    return "Môn học của lộ trình không còn tồn tại.";
  }

  if (requirePublishable && contents.length === 0) {
    return "Lộ trình cần có ít nhất một nội dung trước khi xuất bản.";
  }

  const examIds = [
    ...new Set(
      contents
        .filter((content) => content.content_type === "exam")
        .map((content) => content.exam_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const topicIds = [
    ...new Set(
      contents
        .filter(
          (content) =>
            content.content_type === "practice" ||
            content.content_type === "lesson",
        )
        .map((content) => content.topic_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (examIds.length > 0) {
    const examFilter: Record<string, unknown> = {
      _id: { $in: examIds },
      $or: [{ subject_id: subjectId }, { subject_ids: subjectId }],
    };
    if (user.role !== "admin") {
      examFilter.created_by = user.id;
    }
    if (requirePublishable) {
      examFilter.is_published = true;
    }
    const availableExams = await Exam.find(examFilter).select("_id").lean();
    if (availableExams.length !== examIds.length) {
      return requirePublishable
        ? "Mỗi đề thi trong lộ trình phải tồn tại, thuộc quyền quản lý của bạn và đã được xuất bản."
        : "Một hoặc nhiều đề thi không tồn tại hoặc bạn không có quyền sử dụng.";
    }
  }

  if (topicIds.length > 0) {
    const availableTopics = await Topic.countDocuments({
      _id: { $in: topicIds },
      subject_id: subjectId,
    });
    if (availableTopics !== topicIds.length) {
      return "Bài học hoặc chuyên đề trong lộ trình phải thuộc môn học đã chọn.";
    }
  }

  return null;
}
