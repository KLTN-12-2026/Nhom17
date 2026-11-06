import { connectDB } from "@/lib/db";
import { Subject, Topic, Question } from "@/models";
import type { SubjectItem, TopicItem, TopicStats } from "@/components/subjects/knowledge-tree-manager";

export async function getKnowledgeTreeData(): Promise<{
  subjects: SubjectItem[];
  topics: TopicItem[];
}> {
  await connectDB();

  const [rawSubjects, rawTopics, questionCounts] = await Promise.all([
    Subject.find({})
      .populate("created_by", "name email")
      .sort({ subject_name: 1 })
      .lean(),
    Topic.find({})
      .populate("created_by", "name email")
      .sort({ level: 1, topic_name: 1 })
      .lean(),
    Question.aggregate([
      {
        $group: {
          _id: "$topic_id",
          total: { $sum: 1 },
          easy: { $sum: { $cond: [{ $eq: ["$difficulty_level", "easy"] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ["$difficulty_level", "medium"] }, 1, 0] } },
          hard: { $sum: { $cond: [{ $eq: ["$difficulty_level", "hard"] }, 1, 0] } },
          aiCount: { $sum: { $cond: [{ $eq: ["$is_ai_generated", true] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const countMap = new Map<string, TopicStats>();
  for (const c of questionCounts) {
    if (c._id) {
      countMap.set(String(c._id), {
        total: c.total || 0,
        easy: c.easy || 0,
        medium: c.medium || 0,
        hard: c.hard || 0,
        aiCount: c.aiCount || 0,
      });
    }
  }

  function serializeCreator(
    creator: unknown
  ): { _id: string; name?: string; email?: string } | string | null {
    if (!creator) return null;
    if (typeof creator === "object" && creator !== null && "_id" in creator) {
      const obj = creator as { _id: unknown; name?: string; email?: string };
      return {
        _id: String(obj._id),
        name: obj.name,
        email: obj.email,
      };
    }
    return String(creator);
  }

  const topics: TopicItem[] = rawTopics.map((t) => {
    const stats = countMap.get(String(t._id)) || {
      total: 0,
      easy: 0,
      medium: 0,
      hard: 0,
      aiCount: 0,
    };
    return {
      _id: String(t._id),
      subject_id: String(t.subject_id),
      parent_id: t.parent_id ? String(t.parent_id) : null,
      topic_name: t.topic_name,
      description: t.description || "",
      level: t.level || 1,
      created_by: serializeCreator(t.created_by),
      questionCount: stats.total,
      stats,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
    };
  });

  const subjects: SubjectItem[] = rawSubjects.map((s) => {
    const subId = String(s._id);
    const subTopics = topics.filter((t) => t.subject_id === subId);
    const totalQ = subTopics.reduce((sum, t) => sum + (t.questionCount || 0), 0);
    const totalAiQ = subTopics.reduce((sum, t) => sum + (t.stats?.aiCount || 0), 0);
    return {
      _id: subId,
      subject_name: s.subject_name,
      description: s.description || "",
      created_by: serializeCreator(s.created_by),
      topicCount: subTopics.length,
      questionCount: totalQ,
      aiQuestionCount: totalAiQ,
      createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : undefined,
    };
  });

  return { subjects, topics };
}

