import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Subject, Topic, Question, ExamAttempt } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import mongoose from "mongoose";

/**
 * GET /api/student/practice/topics
 * Trả về danh sách môn học, cây chuyên đề 2 cấp và số lượng câu hỏi trong ngân hàng
 * Kèm thống kê tiến độ tự học của học viên hiện tại
 */
export async function GET(request: Request) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const requestedSubjectId = searchParams.get("subject_id");
    const requestedTopicId = searchParams.get("topic_id");

    // Lấy danh sách môn học
    const subjects = await Subject.find().sort({ subject_name: 1 }).lean();
    if (subjects.length === 0) {
      return NextResponse.json({
        success: true,
        subjects: [],
        selected_subject_id: null,
        chapters: [],
        stats: { totalQuestions: 0, totalPracticed: 0 },
      });
    }

    // Nếu truyền topic_id -> tra cứu môn học tương ứng
    let resolvedSubjectId = requestedSubjectId?.trim() || "";
    if (!resolvedSubjectId && requestedTopicId && mongoose.Types.ObjectId.isValid(requestedTopicId)) {
      const targetTopic = await Topic.findById(requestedTopicId)
        .select("subject_id")
        .lean();
      if (targetTopic?.subject_id) {
        resolvedSubjectId = String(targetTopic.subject_id);
      }
    }

    // Chọn môn học mục tiêu
    let activeSubject = subjects[0];
    if (resolvedSubjectId) {
      const found = subjects.find((s) => String(s._id) === resolvedSubjectId);
      if (found) activeSubject = found;
    }

    // Lấy toàn bộ topics của môn học này
    const topics = await Topic.find({ subject_id: activeSubject._id })
      .sort({ level: 1, createdAt: 1 })
      .lean();

    // Đếm số lượng câu hỏi thực tế trong Question theo từng topic_id
    const questionCounts = await Question.aggregate([
      {
        $group: {
          _id: "$topic_id",
          total: { $sum: 1 },
          easy: {
            $sum: { $cond: [{ $eq: ["$difficulty_level", "easy"] }, 1, 0] },
          },
          medium: {
            $sum: { $cond: [{ $eq: ["$difficulty_level", "medium"] }, 1, 0] },
          },
          hard: {
            $sum: { $cond: [{ $eq: ["$difficulty_level", "hard"] }, 1, 0] },
          },
        },
      },
    ]);

    const countMap = new Map<string, { total: number; easy: number; medium: number; hard: number }>();
    for (const item of questionCounts) {
      if (item._id) {
        countMap.set(String(item._id), {
          total: item.total || 0,
          easy: item.easy || 0,
          medium: item.medium || 0,
          hard: item.hard || 0,
        });
      }
    }

    // Lấy lịch sử làm bài của học viên hiện tại để tính huy hiệu & điểm cao nhất
    const userAttempts = await ExamAttempt.find({
      user_id: new mongoose.Types.ObjectId(user.id),
      attempt_type: "practice",
      status: "submitted",
    })
      .select("topic_id score total_correct total_wrong duration_seconds createdAt")
      .lean();

    const progressMap = new Map<
      string,
      { attemptsCount: number; highestScore: number; lastScore: number }
    >();

    for (const att of userAttempts) {
      if (att.topic_id) {
        const tid = String(att.topic_id);
        const current = progressMap.get(tid) || {
          attemptsCount: 0,
          highestScore: 0,
          lastScore: 0,
        };
        current.attemptsCount += 1;
        if (typeof att.score === "number" && att.score > current.highestScore) {
          current.highestScore = att.score;
        }
        current.lastScore = att.score;
        progressMap.set(tid, current);
      }
    }

    // Phân tách cây 2 cấp hiển thị: Chuyên đề lớn (level 1) -> Dạng bài (level 2),
    // đồng thời cộng dồn câu hỏi từ tất cả nhánh con cháu (level >= 3 nếu có)
    const childrenMap = new Map<string, string[]>();
    for (const t of topics) {
      if (t.parent_id) {
        const pId = String(t.parent_id);
        const list = childrenMap.get(pId) || [];
        list.push(String(t._id));
        childrenMap.set(pId, list);
      }
    }

    const getBranchStats = (rootId: string) => {
      const visited = new Set<string>([rootId]);
      const queue = [rootId];
      const stats = { total: 0, easy: 0, medium: 0, hard: 0 };

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const c = countMap.get(curr);
        if (c) {
          stats.total += c.total;
          stats.easy += c.easy;
          stats.medium += c.medium;
          stats.hard += c.hard;
        }
        const kids = childrenMap.get(curr) || [];
        for (const k of kids) {
          if (!visited.has(k)) {
            visited.add(k);
            queue.push(k);
          }
        }
      }
      return stats;
    };

    const level1List = topics.filter((t) => Number(t.level) === 1 || !t.parent_id);
    const level2List = topics.filter((t) => Number(t.level) === 2 && t.parent_id);

    let subjectTotalQuestions = 0;

    const chapters = level1List.map((chapter) => {
      const chapterIdStr = String(chapter._id);
      const subtopics = level2List
        .filter((sub) => String(sub.parent_id) === chapterIdStr)
        .map((sub) => {
          const subIdStr = String(sub._id);
          const qStats = getBranchStats(subIdStr);
          const prog = progressMap.get(subIdStr) || { attemptsCount: 0, highestScore: 0, lastScore: 0 };

          subjectTotalQuestions += qStats.total;

          let masteryStatus: "not_started" | "in_progress" | "mastered" = "not_started";
          if (prog.attemptsCount > 0) {
            masteryStatus = prog.highestScore >= 8 ? "mastered" : "in_progress";
          }

          return {
            _id: subIdStr,
            topic_name: sub.topic_name,
            description: sub.description || "",
            level: 2,
            question_count: qStats.total,
            difficulty_breakdown: {
              easy: qStats.easy,
              medium: qStats.medium,
              hard: qStats.hard,
            },
            progress: {
              attempts_count: prog.attemptsCount,
              highest_score: prog.highestScore,
              last_score: prog.lastScore,
              status: masteryStatus,
            },
          };
        });

      // Số câu hỏi trực tiếp thuộc chapter (nếu có) + các dạng bài con
      const directQStats = countMap.get(chapterIdStr) || { total: 0, easy: 0, medium: 0, hard: 0 };
      const totalChapterQuestions =
        directQStats.total +
        subtopics.reduce((acc, curr) => acc + curr.question_count, 0);

      const chapterProg = progressMap.get(chapterIdStr) || { attemptsCount: 0, highestScore: 0, lastScore: 0 };

      return {
        _id: chapterIdStr,
        topic_name: chapter.topic_name,
        description: chapter.description || "",
        level: 1,
        total_questions: totalChapterQuestions,
        subtopics,
        progress: {
          attempts_count: chapterProg.attemptsCount,
          highest_score: chapterProg.highestScore,
        },
      };
    });

    return NextResponse.json({
      success: true,
      subjects: subjects.map((s) => ({
        _id: String(s._id),
        subject_name: s.subject_name,
        description: s.description || "",
      })),
      selected_subject_id: String(activeSubject._id),
      chapters,
      stats: {
        totalQuestions: subjectTotalQuestions,
        totalPracticedAttempts: userAttempts.length,
      },
    });
  } catch (error) {
    console.error("Lỗi khi tải danh sách chủ đề tự luyện:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải danh sách chủ đề tự luyện" },
      { status: 500 }
    );
  }
}
