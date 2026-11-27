import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { checkApiAuthorization } from "@/lib/auth-guards";
import {
  getCompletableRoadmapContents,
  getRoadmapContents,
} from "@/lib/roadmaps";
import { ExamAttempt, LearningProgress, Roadmap, User } from "@/models";

type RouteContext = { params: Promise<{ id: string }> };
type LeaderboardMode = "progress" | "score";

export async function GET(request: Request, { params }: RouteContext) {
  const { user, errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID lộ trình không hợp lệ." },
        { status: 400 },
      );
    }

    await connectDB();
    const filter: Record<string, unknown> = { _id: id };
    if (user.role !== "admin") filter.teacher_id = user.id;
    const roadmap = await Roadmap.findOne(filter).lean();
    if (!roadmap) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền xem." },
        { status: 404 },
      );
    }

    const progressRows = await LearningProgress.find({ roadmap_id: roadmap._id })
      .select("user_id completed_content_ids last_activity_at")
      .lean();
    if (progressRows.length === 0) {
      return NextResponse.json({ success: true, leaderboard: [] });
    }

    const contents = getRoadmapContents(roadmap);
    const examIds = contents
      .filter((content) => content.content_type === "exam" && content.exam_id)
      .map((content) => content.exam_id);
    const topicIds = contents
      .filter((content) => content.content_type === "practice" && content.topic_id)
      .map((content) => content.topic_id);
    const attemptFilters: Record<string, unknown>[] = [];
    if (examIds.length) {
      attemptFilters.push({
        exam_id: { $in: examIds },
        attempt_type: "official",
      });
    }
    if (topicIds.length) {
      attemptFilters.push({
        topic_id: { $in: topicIds },
        attempt_type: "practice",
      });
    }

    const scoresByUser = new Map<string, number>();
    if (attemptFilters.length) {
      const attempts = await ExamAttempt.find({
        user_id: { $in: progressRows.map((row) => row.user_id) },
        status: "submitted",
        $or: attemptFilters,
      })
        .select("user_id score")
        .lean();
      for (const attempt of attempts) {
        const key = String(attempt.user_id);
        scoresByUser.set(
          key,
          Math.max(scoresByUser.get(key) || 0, Number(attempt.score) || 0),
        );
      }
    }

    const users = await User.find({
      _id: { $in: progressRows.map((row) => row.user_id) },
    })
      .select("name avatar_url")
      .lean();
    const usersById = new Map(users.map((learner) => [String(learner._id), learner]));
    const completableContents = getCompletableRoadmapContents(contents);
    const completableIds = new Set(
      completableContents.map((content) => String(content._id)),
    );
    const totalContents = completableContents.length;
    const leaderboard = progressRows
      .map((row) => {
        const learner = usersById.get(String(row.user_id));
        const completedCount = new Set(
          (row.completed_content_ids || [])
            .map(String)
            .filter((contentId: string) => completableIds.has(contentId)),
        ).size;
        const derivedProgress =
          totalContents > 0
            ? Math.round((completedCount / totalContents) * 100)
            : 100;
        return {
          user_id: String(row.user_id),
          name: learner?.name || "Học viên",
          avatar_url: learner?.avatar_url || "",
          completion_percentage: derivedProgress,
          best_score: scoresByUser.get(String(row.user_id)) || 0,
          last_activity_at: row.last_activity_at,
        };
      })
      .filter((row) => usersById.has(row.user_id));

    const mode: LeaderboardMode =
      new URL(request.url).searchParams.get("sort") === "score"
        ? "score"
        : "progress";
    leaderboard.sort((a, b) =>
      mode === "score"
        ? b.best_score - a.best_score ||
          b.completion_percentage - a.completion_percentage
        : b.completion_percentage - a.completion_percentage ||
          b.best_score - a.best_score,
    );

    return NextResponse.json({ success: true, leaderboard, sort: mode });
  } catch (error) {
    console.error("Lỗi khi tải bảng xếp hạng lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải bảng xếp hạng." },
      { status: 500 },
    );
  }
}
