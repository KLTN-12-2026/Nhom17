"use client";

import React, { useState, useEffect, useMemo } from "react";
import QuestionCreationModal from "@/components/questions/question-creation-modal";

export interface CurrentUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "admin" | "instructor" | "student";
}

interface QuestionBankManagerProps {
  currentUser?: CurrentUser | null;
}

interface Option {
  option_label: string;
  content: string;
  is_correct: boolean;
}

interface TopicInfo {
  _id: string;
  topic_name: string;
  subject_id?: {
    _id: string;
    subject_name: string;
  };
}

interface QuestionItem {
  _id: string;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  is_ai_generated: boolean;
  explanation?: string;
  options: Option[];
  topic_id?: TopicInfo;
  created_by?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  createdAt: string;
}

interface SubjectItem {
  _id: string;
  subject_name: string;
  code?: string;
  description?: string;
  created_by?: string | { _id: string; name?: string; email?: string } | null;
  topicCount?: number;
  questionCount?: number;
}

interface TopicItem {
  _id: string;
  topic_name: string;
  subject_id: string;
  parent_id?: string | null;
  description?: string;
  created_by?: string | { _id: string; name?: string; email?: string } | null;
  level: number;
  questionCount?: number;
  stats?: {
    total: number;
    easy: number;
    medium: number;
    hard: number;
    aiCount?: number;
  };
}

interface TopicTreeNode extends TopicItem {
  children: TopicTreeNode[];
  subtreeQuestionCount: number;
  subtreeStats: {
    total: number;
    easy: number;
    medium: number;
    hard: number;
    aiCount: number;
  };
}


export default function QuestionBankManager({ currentUser }: QuestionBankManagerProps = {}) {
  // Navigation view levels:
  // "subjects": xem danh mục các gói môn học
  // "topics": xem danh sách các gói chuyên đề trong môn đã chọn
  // "questions": mở tung danh sách câu hỏi trong chuyên đề đã chọn
  const [viewLevel, setViewLevel] = useState<"subjects" | "topics" | "questions">("subjects");

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Selected entities for drill-down navigation
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);

  // Filters inside questions view
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");

  // Expanded explanations
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  // Delete question modal state
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteQuestionError, setDeleteQuestionError] = useState("");

  // Delete subject modal state
  const [deletingSubject, setDeletingSubject] = useState<SubjectItem | null>(null);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);
  const [deleteSubjectError, setDeleteSubjectError] = useState("");

  // Delete topic modal state
  const [deletingTopic, setDeletingTopic] = useState<TopicItem | null>(null);
  const [isDeletingTopic, setIsDeletingTopic] = useState(false);
  const [deleteTopicError, setDeleteTopicError] = useState("");

  // Unified Question Creation Hub (3 Tabs: Manual, File Import, AI)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<"manual" | "file" | "ai">("manual");
  const [targetCreationTopicId, setTargetCreationTopicId] = useState("");

  // Edit question modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTopicId, setEditTopicId] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDifficulty, setEditDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [editExplanation, setEditExplanation] = useState("");
  const [editOptions, setEditOptions] = useState<Option[]>([
    { option_label: "A", content: "", is_correct: true },
    { option_label: "B", content: "", is_correct: false },
    { option_label: "C", content: "", is_correct: false },
    { option_label: "D", content: "", is_correct: false },
  ]);

  // 1. Reload metadata for user actions
  async function reloadMetadata() {
    try {
      const res = await fetch("/api/instructor/subjects");
      const data = await res.json();
      if (data.success) {
        setSubjects(data.subjects || []);
        setTopics(data.topics || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh mục môn học:", err);
    }
  }

  useEffect(() => {
    let ignore = false;
    fetch("/api/instructor/subjects")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setSubjects(data.subjects || []);
          setTopics(data.topics || []);
        }
      })
      .catch((err) => {
        console.error("Lỗi khi tải danh mục môn học:", err);
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingMetadata(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // 2. Reload questions for user actions
  async function reloadQuestionsList() {
    setIsLoadingQuestions(true);
    try {
      const params = new URLSearchParams();
      if (selectedTopic) {
        params.set("topic_id", selectedTopic._id);
      } else if (selectedSubject) {
        params.set("subject_id", selectedSubject._id);
      }
      if (selectedDifficulty !== "all") params.set("difficulty", selectedDifficulty);
      if (selectedSource === "ai") params.set("is_ai_generated", "true");
      if (selectedSource === "manual") params.set("is_ai_generated", "false");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/instructor/questions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải câu hỏi:", err);
    } finally {
      setIsLoadingQuestions(false);
    }
  }

  useEffect(() => {
    if (viewLevel !== "questions") return;

    let ignore = false;
    const params = new URLSearchParams();
    if (selectedTopic) {
      params.set("topic_id", selectedTopic._id);
    } else if (selectedSubject) {
      params.set("subject_id", selectedSubject._id);
    }
    if (selectedDifficulty !== "all") params.set("difficulty", selectedDifficulty);
    if (selectedSource === "ai") params.set("is_ai_generated", "true");
    if (selectedSource === "manual") params.set("is_ai_generated", "false");
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    fetch(`/api/instructor/questions?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setQuestions(data.questions || []);
        }
      })
      .catch((err) => {
        console.error("Lỗi khi tải câu hỏi:", err);
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingQuestions(false);
        }
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewLevel, selectedTopic, selectedDifficulty, selectedSource]);

  // Topics belonging to current selected subject
  const currentSubjectTopics = useMemo(() => {
    if (!selectedSubject) return [];
    return topics.filter((t) => String(t.subject_id) === String(selectedSubject._id));
  }, [topics, selectedSubject]);

  // Xây dựng cây chuyên đề phân cấp (Chương -> Bài -> Dạng) cho môn đang chọn
  const subjectTopicTree = useMemo(() => {
    const nodeMap = new Map<string, TopicTreeNode>();
    for (const t of currentSubjectTopics) {
      const base = t.stats || {
        total: t.questionCount || 0,
        easy: 0,
        medium: 0,
        hard: 0,
        aiCount: 0,
      };
      nodeMap.set(String(t._id), {
        ...t,
        children: [],
        subtreeQuestionCount: base.total,
        subtreeStats: {
          total: base.total,
          easy: base.easy,
          medium: base.medium,
          hard: base.hard,
          aiCount: base.aiCount || 0,
        },
      });
    }

    const roots: TopicTreeNode[] = [];
    for (const node of nodeMap.values()) {
      const pId = node.parent_id ? String(node.parent_id) : null;
      if (pId && nodeMap.has(pId) && pId !== String(node._id)) {
        nodeMap.get(pId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    function aggregateNode(node: TopicTreeNode) {
      const agg = {
        total: node.stats?.total ?? node.questionCount ?? 0,
        easy: node.stats?.easy ?? 0,
        medium: node.stats?.medium ?? 0,
        hard: node.stats?.hard ?? 0,
        aiCount: node.stats?.aiCount ?? 0,
      };
      node.children.sort((a, b) => a.topic_name.localeCompare(b.topic_name, "vi"));
      for (const child of node.children) {
        const cStats = aggregateNode(child);
        agg.total += cStats.total;
        agg.easy += cStats.easy;
        agg.medium += cStats.medium;
        agg.hard += cStats.hard;
        agg.aiCount += cStats.aiCount;
      }
      node.subtreeQuestionCount = agg.total;
      node.subtreeStats = agg;
      return agg;
    }

    roots.sort((a, b) => a.topic_name.localeCompare(b.topic_name, "vi"));
    for (const r of roots) {
      aggregateNode(r);
    }
    return roots;
  }, [currentSubjectTopics]);

  // Nhóm toàn bộ chuyên đề theo Môn học & Cây phân cấp cho modal Sửa Câu Hỏi
  const groupedAllTopicOptions = useMemo(() => {
    return subjects.map((sub) => {
      const subTopics = topics.filter((t) => String(t.subject_id) === String(sub._id));
      const childrenMap = new Map<string, TopicItem[]>();
      const roots: TopicItem[] = [];
      const idSet = new Set(subTopics.map((t) => String(t._id)));

      for (const t of subTopics) {
        const pId = t.parent_id ? String(t.parent_id) : null;
        if (pId && idSet.has(pId) && pId !== String(t._id)) {
          if (!childrenMap.has(pId)) childrenMap.set(pId, []);
          childrenMap.get(pId)!.push(t);
        } else {
          roots.push(t);
        }
      }

      const items: { _id: string; label: string }[] = [];
      function traverse(list: TopicItem[], depth: number) {
        list.sort((a, b) => a.topic_name.localeCompare(b.topic_name, "vi"));
        for (const item of list) {
          const indent =
            depth === 0 ? "📁 " : `${"\u00A0\u00A0\u00A0\u00A0".repeat(depth)}↳ `;
          items.push({
            _id: item._id,
            label: `${indent}${item.topic_name}`,
          });
          const kids = childrenMap.get(String(item._id)) || [];
          if (kids.length > 0) traverse(kids, depth + 1);
        }
      }
      traverse(roots, 0);
      return {
        subject_id: sub._id,
        subject_name: sub.subject_name,
        items,
      };
    });
  }, [subjects, topics]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const totalSubjects = subjects.length;
    const totalTopics = topics.length;
    const totalQuestions = subjects.reduce((sum, s) => sum + (s.questionCount || 0), 0);
    return { totalSubjects, totalTopics, totalQuestions };
  }, [subjects, topics]);

  // Open a Subject folder (Move to Level 2: Topics)
  function handleSelectSubject(sub: SubjectItem) {
    setSelectedSubject(sub);
    setSelectedTopic(null);
    setViewLevel("topics");
  }

  // Open a Topic folder (Move to Level 3: Questions - "Mở tung câu hỏi")
  function handleSelectTopic(top: TopicItem) {
    setSelectedTopic(top);
    setSearchQuery("");
    setSelectedDifficulty("all");
    setSelectedSource("all");
    setViewLevel("questions");
  }

  // Navigate back to Subjects (Level 1)
  function handleBackToSubjects() {
    setSelectedSubject(null);
    setSelectedTopic(null);
    setViewLevel("subjects");
    reloadMetadata();
  }

  // Navigate back to Topics (Level 2)
  function handleBackToTopics() {
    setSelectedTopic(null);
    setViewLevel("topics");
    reloadMetadata();
  }

  // Toggle explanation accordion
  function toggleExplanation(questionId: string) {
    setExpandedExplanations((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  }

  // Open Edit Modal
  function handleOpenEdit(q: QuestionItem) {
    setEditingId(q._id);
    setEditContent(q.content);
    setEditDifficulty(q.difficulty_level);
    setEditExplanation(q.explanation || "");
    setEditTopicId(q.topic_id?._id || selectedTopic?._id || topics[0]?._id || "");

    const labels = ["A", "B", "C", "D"];
    const baseOptions: Option[] = labels.map((lbl, idx) => {
      const existing = q.options[idx];
      return {
        option_label: lbl,
        content: existing?.content || "",
        is_correct: existing?.is_correct || false,
      };
    });
    setEditOptions(baseOptions);
    setEditFormError("");
    setIsEditModalOpen(true);
  }

  // Save Edit Question
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditFormError("");

    if (!editContent.trim()) {
      setEditFormError("Vui lòng nhập nội dung câu hỏi.");
      return;
    }

    const emptyOpt = editOptions.some((o) => !o.content.trim());
    if (emptyOpt) {
      setEditFormError("Tất cả 4 phương án A, B, C, D đều bắt buộc phải có nội dung.");
      return;
    }

    const hasCorrect = editOptions.some((o) => o.is_correct);
    if (!hasCorrect) {
      setEditFormError("Bắt buộc phải đánh dấu ít nhất một phương án là đáp án đúng.");
      return;
    }

    setIsEditSubmitting(true);
    try {
      const res = await fetch(`/api/instructor/questions/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: editTopicId,
          content: editContent.trim(),
          difficulty_level: editDifficulty,
          explanation: editExplanation.trim(),
          options: editOptions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        reloadQuestionsList();
        reloadMetadata();
      } else {
        setEditFormError(data.message || "Không thể cập nhật câu hỏi");
      }
    } catch {
      setEditFormError("Lỗi kết nối máy chủ khi cập nhật");
    } finally {
      setIsEditSubmitting(false);
    }
  }

  // Permission helpers
  function canManageSubject(sub: SubjectItem): boolean {
    if (!currentUser) return true;
    if (currentUser.role === "admin") return true;
    if (!sub.created_by) return true;
    const creatorId = typeof sub.created_by === "object" ? sub.created_by?._id : sub.created_by;
    return String(creatorId) === String(currentUser.id);
  }

  function canManageTopic(top: TopicItem): boolean {
    if (!currentUser) return true;
    if (currentUser.role === "admin") return true;
    if (!top.created_by) return true;
    const creatorId = typeof top.created_by === "object" ? top.created_by?._id : top.created_by;
    return String(creatorId) === String(currentUser.id);
  }

  // Delete question confirmation
  async function handleConfirmDelete() {
    if (!deletingQuestionId) return;
    setIsDeleting(true);
    setDeleteQuestionError("");
    try {
      const res = await fetch(`/api/instructor/questions/${deletingQuestionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setQuestions((prev) => prev.filter((q) => q._id !== deletingQuestionId));
        setDeletingQuestionId(null);
        reloadMetadata();
      } else {
        setDeleteQuestionError(data.message || "Không thể xóa câu hỏi");
      }
    } catch {
      setDeleteQuestionError("Lỗi kết nối khi xóa câu hỏi");
    } finally {
      setIsDeleting(false);
    }
  }

  // Delete subject confirmation
  async function handleConfirmDeleteSubject() {
    if (!deletingSubject) return;
    if ((deletingSubject.questionCount || 0) > 0) {
      setDeleteSubjectError(
        `Môn học này đang chứa ${deletingSubject.questionCount} câu hỏi trong các chuyên đề. Không thể xóa môn học khi vẫn còn câu hỏi!`
      );
      return;
    }
    setIsDeletingSubject(true);
    setDeleteSubjectError("");
    try {
      const res = await fetch(`/api/instructor/subjects/${deletingSubject._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (selectedSubject?._id === deletingSubject._id) {
          setSelectedSubject(null);
          setSelectedTopic(null);
          setViewLevel("subjects");
        }
        setDeletingSubject(null);
        reloadMetadata();
      } else {
        setDeleteSubjectError(data.message || "Không thể xóa môn học");
      }
    } catch {
      setDeleteSubjectError("Lỗi kết nối khi xóa môn học");
    } finally {
      setIsDeletingSubject(false);
    }
  }

  // Delete topic confirmation
  async function handleConfirmDeleteTopic() {
    if (!deletingTopic) return;
    if ((deletingTopic.questionCount || 0) > 0) {
      setDeleteTopicError(
        `Chuyên đề này đang chứa ${deletingTopic.questionCount} câu hỏi. Không thể xóa chuyên đề khi vẫn còn câu hỏi!`
      );
      return;
    }
    setIsDeletingTopic(true);
    setDeleteTopicError("");
    try {
      const res = await fetch(`/api/instructor/topics/${deletingTopic._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (selectedTopic?._id === deletingTopic._id) {
          setSelectedTopic(null);
          setViewLevel("topics");
        }
        setDeletingTopic(null);
        reloadMetadata();
      } else {
        setDeleteTopicError(data.message || "Không thể xóa chuyên đề");
      }
    } catch {
      setDeleteTopicError("Lỗi kết nối khi xóa chuyên đề");
    } finally {
      setIsDeletingTopic(false);
    }
  }


  // Open Unified Add / Import / AI Modal
  function handleOpenAddModal(targetTopicId?: string, defaultTab: "manual" | "file" | "ai" = "manual") {
    const defaultTopic = targetTopicId || selectedTopic?._id || topics[0]?._id || "";
    setTargetCreationTopicId(defaultTopic);
    setAddModalTab(defaultTab);
    setIsAddModalOpen(true);
  }


  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* BREADCRUMB & NAVIGATION BAR */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 px-4 py-3 rounded-xl shadow-2xs flex items-center justify-between">
        {/* Breadcrumb Path */}
        <nav className="flex items-center gap-2 text-xs md:text-sm font-medium">
          <button
            type="button"
            onClick={handleBackToSubjects}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewLevel === "subjects"
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <span className="text-sm">📚</span>
            Kho Môn Học
          </button>

          {selectedSubject && (
            <>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <button
                type="button"
                onClick={handleBackToTopics}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewLevel === "topics"
                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <span className="text-sm">📐</span>
                {selectedSubject.subject_name}
              </button>
            </>
          )}

          {selectedTopic && (
            <>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5">
                <span className="text-sm">📁</span>
                {selectedTopic.topic_name}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TẦNG 1: DANH MỤC CÁC GÓI MÔN HỌC (Level: "subjects") */}
      {/* ========================================================================= */}
      {viewLevel === "subjects" && (
        <div className="space-y-5">
          {/* Soft Overview Metrics (Thân thiện, không bị chói mắt) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-semibold">
                📚
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Môn Học Khảo Thí</p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {overallStats.totalSubjects} Môn học
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg font-semibold">
                📁
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Gói Chuyên Đề</p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {overallStats.totalTopics} Chuyên đề
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg font-semibold">
                📝
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Kho Câu Hỏi Đã Soạn</p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {overallStats.totalQuestions} Câu hỏi
                </p>
              </div>
            </div>
          </div>

          {/* List of Subject Packages / Folders */}
          {isLoadingMetadata ? (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Đang tải các gói môn học...</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Danh Mục Gói Môn Học
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">Bấm vào môn để xem các chuyên đề bên trong</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((sub, sIdx) => {
                  return (
                    <div
                      key={sub._id}
                      onClick={() => handleSelectSubject(sub)}
                      className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-600 p-5 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        {/* Folder Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shadow-2xs group-hover:scale-105 transition-transform">
                            📁
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {sub.code || `MÔN-${sIdx + 1}`}
                            </span>
                            {sub.created_by && (
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                                  canManageSubject(sub)
                                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                }`}
                              >
                                {canManageSubject(sub) ? "Của tôi" : "Đồng nghiệp"}
                              </span>
                            )}
                            {canManageSubject(sub) && (
                              <button
                                type="button"
                                title="Xóa môn học này"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingSubject(sub);
                                  setDeleteSubjectError("");
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Folder Info */}
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {sub.subject_name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {sub.description || "Kho câu hỏi chuẩn thi THPT theo cấu trúc ma trận của Bộ GD&ĐT."}
                        </p>
                      </div>

                      {/* Folder Stats Footer */}
                      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {sub.topicCount || 0} chuyên đề
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {sub.questionCount || 0} câu hỏi
                          </span>
                        </div>
                        <span className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all text-xs font-medium flex items-center gap-1">
                          Khám phá →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TẦNG 2: DANH SÁCH GÓI CHUYÊN ĐỀ TRONG MÔN (Level: "topics") */}
      {/* ========================================================================= */}
      {viewLevel === "topics" && selectedSubject && (
        <div className="space-y-6">
          {/* Header with back button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={handleBackToSubjects}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-base font-bold transition-colors cursor-pointer shrink-0"
                title="Quay lại danh mục môn học"
              >
                ←
              </button>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold shrink-0">
                      📐
                    </span>
                    <span>Môn: {selectedSubject.subject_name}</span>
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/50">
                    {currentSubjectTopics.length} chuyên đề
                  </span>
                  {canManageSubject(selectedSubject) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingSubject(selectedSubject);
                        setDeleteSubjectError("");
                      }}
                      className="text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-0.5 rounded-lg border border-transparent hover:border-rose-200 transition cursor-pointer"
                      title="Xóa môn học này (chỉ khi không còn câu hỏi)"
                    >
                      Xóa môn
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Chọn chuyên đề bài học để xem kho câu hỏi hoặc sử dụng Trợ lý AI để tự động tạo đề thi bám sát chương trình.
                </p>
              </div>
            </div>
          </div>

          {/* Hierarchical Tree of Topics inside Subject */}
          {subjectTopicTree.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Chưa có gói chuyên đề nào trong môn này.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {subjectTopicTree.map((rootNode, rIdx) => {
                function renderTopicBranch(node: TopicTreeNode, depth: number, idxLabel: string) {
                  const hasKids = node.children.length > 0;
                  const directCount = node.stats?.total ?? node.questionCount ?? 0;

                  return (
                    <div key={node._id} className="space-y-2.5">
                      <div
                        onClick={() => handleSelectTopic(node)}
                        className={`group border cursor-pointer transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          depth === 0
                            ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500 p-5 rounded-2xl shadow-2xs hover:shadow-md"
                            : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-purple-500 p-3.5 rounded-xl"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                depth === 0
                                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60"
                                  : depth === 1
                                  ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/50"
                                  : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50"
                              }`}
                            >
                              {depth === 0 ? `📁 Chương / Cấp 1 (${idxLabel})` : `↳ Cấp ${node.level}`}
                            </span>

                            <h4
                              className={`font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors ${
                                depth === 0 ? "text-sm sm:text-base" : "text-xs sm:text-sm"
                              }`}
                            >
                              {node.topic_name}
                            </h4>

                            {hasKids && (
                              <span className="text-[11px] text-slate-400 font-medium">
                                ({node.children.length} mục con)
                              </span>
                            )}
                          </div>

                          {node.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                              {node.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {node.subtreeQuestionCount} câu hỏi
                              {hasKids && directCount !== node.subtreeQuestionCount
                                ? ` (trực tiếp: ${directCount})`
                                : ""}
                            </span>
                            <span className="text-emerald-600 font-medium">
                              {node.subtreeStats.easy} Dễ
                            </span>
                            <span>•</span>
                            <span className="text-amber-600 font-medium">
                              {node.subtreeStats.medium} TB
                            </span>
                            <span>•</span>
                            <span className="text-rose-600 font-medium">
                              {node.subtreeStats.hard} Khó
                            </span>
                          </div>
                        </div>

                        <div
                          className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenAddModal(node._id, "ai")}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 transition cursor-pointer flex items-center gap-1"
                            title={`AI tự động sinh câu hỏi theo bài "${node.topic_name}"`}
                          >
                            <span>✨</span> AI Sinh Đề
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectTopic(node)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer"
                          >
                            Mở gói →
                          </button>

                          {canManageTopic(node) && (
                            <button
                              type="button"
                              title="Xóa chuyên đề này"
                              onClick={() => {
                                setDeletingTopic({
                                  ...node,
                                  questionCount: node.subtreeQuestionCount,
                                });
                                setDeleteTopicError("");
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>

                      {hasKids && (
                        <div className="ml-5 sm:ml-8 pl-4 border-l-2 border-indigo-200/80 dark:border-slate-700 space-y-2.5">
                          {node.children.map((child, cIdx) =>
                            renderTopicBranch(child, depth + 1, `${idxLabel}.${cIdx + 1}`)
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return renderTopicBranch(rootNode, 0, `${rIdx + 1}`);
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TẦNG 3: MỞ TUNG DANH SÁCH CÂU HỎI TRONG GÓI (Level: "questions") */}
      {/* ========================================================================= */}
      {viewLevel === "questions" && selectedTopic && (
        <div className="space-y-6">
          {/* Header of the opened package */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToTopics}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                title="Quay lại danh sách chuyên đề"
              >
                ←
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {selectedSubject?.subject_name}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-medium text-slate-500">
                    {questions.length} câu hỏi trong gói này
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    📁 Gói: {selectedTopic.topic_name}
                  </h3>
                  {canManageTopic(selectedTopic) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingTopic(selectedTopic);
                        setDeleteTopicError("");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 transition cursor-pointer whitespace-nowrap ml-1"
                      title="Xóa chuyên đề này (chỉ khi không còn câu hỏi)"
                    >
                      <span>🗑️</span>
                      <span>Xóa gói</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenAddModal(selectedTopic._id, "ai")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm transition cursor-pointer whitespace-nowrap"
                title="Dùng AI tự động sinh câu hỏi chuẩn SGK theo bài này"
              >
                <span>✨</span> AI Sinh Đề Theo Bài
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddModal(selectedTopic._id, "manual")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition cursor-pointer whitespace-nowrap"
              >
                <span>+</span> Soạn / Nạp Tệp
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar inside this opened package */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") reloadQuestionsList();
                }}
                placeholder="Tìm kiếm câu hỏi trong gói này (nhấn Enter)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="text-xs py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Tất cả độ khó</option>
                <option value="easy">Dễ (Nhận biết)</option>
                <option value="medium">Trung bình (Thông hiểu)</option>
                <option value="hard">Khó (Vận dụng cao)</option>
              </select>

              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="text-xs py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Tất cả nguồn</option>
                <option value="ai">Do AI tạo</option>
                <option value="manual">Giáo viên soạn</option>
              </select>
            </div>
          </div>

          {/* List of Questions in this opened package */}
          {isLoadingQuestions ? (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Đang mở tung các câu hỏi trong gói...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Gói này chưa có câu hỏi nào thỏa mãn bộ lọc.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal(selectedTopic._id, "ai")}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <span>✨</span> AI Tự Sinh Đề Theo Bài Này (1-Click)
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddModal(selectedTopic._id, "manual")}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  + Soạn Thủ Công / Nạp Tệp
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const isExpanded = !!expandedExplanations[q._id];
                return (
                  <div
                    key={q._id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Câu {idx + 1}
                        </span>

                        {q.difficulty_level === "easy" && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Dễ (Nhận biết)
                          </span>
                        )}
                        {q.difficulty_level === "medium" && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Trung bình (Thông hiểu)
                          </span>
                        )}
                        {q.difficulty_level === "hard" && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Khó (Vận dụng cao)
                          </span>
                        )}

                        {q.is_ai_generated ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            ✨ AI sinh
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Giáo viên soạn
                          </span>
                        )}
                      </div>

                      {/* Action buttons: Edit & Delete */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(q)}
                          className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium cursor-pointer"
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingQuestionId(q._id)}
                          className="px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium cursor-pointer"
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="text-slate-900 dark:text-slate-100 font-medium text-sm leading-relaxed mb-4">
                      {q.content}
                    </div>

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-xs transition-all ${
                            opt.is_correct
                              ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium"
                              : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              opt.is_correct
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {opt.option_label || ["A", "B", "C", "D"][oIdx]}
                          </span>
                          <div className="flex-1 pt-0.5">
                            <span>{opt.content}</span>
                            {opt.is_correct && (
                              <span className="ml-2 text-[11px] font-semibold text-emerald-600">
                                ✓ Đáp án đúng
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => toggleExplanation(q._id)}
                          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? "▲ Thu gọn giải thích" : "▼ Xem lời giải chi tiết"}
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            <span className="font-bold text-blue-700 dark:text-blue-400 block mb-1">
                              Phương pháp giải chi tiết:
                            </span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIFIED QUESTION CREATION HUB MODAL (Tạo tay / Nạp file / AI Sinh đề) */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <QuestionCreationModal
          key={`${targetCreationTopicId}-${addModalTab}`}
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          subjects={subjects}
          topics={topics}
          defaultTopicId={targetCreationTopicId}
          defaultTab={addModalTab}
          onSuccess={() => {
            if (viewLevel === "questions") {
              reloadQuestionsList();
            }
            reloadMetadata();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SỬA CÂU HỎI (Tiêu chí 5 & Ràng buộc) */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Chỉnh Sửa Câu Hỏi Trắc Nghiệm
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cập nhật nội dung câu hỏi, điều chỉnh 4 phương án và đáp án đúng
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {editFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {editFormError}
                </div>
              )}

              {/* Topic & Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gói Chuyên Đề
                  </label>
                  <select
                    value={editTopicId}
                    onChange={(e) => setEditTopicId(e.target.value)}
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {groupedAllTopicOptions.map((group) =>
                      group.items.length > 0 ? (
                        <optgroup key={group.subject_id} label={`📚 Môn: ${group.subject_name}`}>
                          {group.items.map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.label}
                            </option>
                          ))}
                        </optgroup>
                      ) : null
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mức Độ Khó
                  </label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value as "easy" | "medium" | "hard")}
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="easy">Dễ (Nhận biết)</option>
                    <option value="medium">Trung bình (Thông hiểu)</option>
                    <option value="hard">Khó (Vận dụng cao)</option>
                  </select>
                </div>
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Đề Bài Câu Hỏi <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {editContent.includes("\n") && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditContent((prev) =>
                            prev
                              .split("\n")
                              .map((l) => l.trim())
                              .filter(Boolean)
                              .join(" ")
                          );
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 px-2 py-0.5 rounded-md font-medium transition flex items-center gap-1 cursor-pointer"
                        title="Gộp các dòng bị ngắt rời rạc (do copy từ PDF/Word) thành một dòng liền mạch"
                      >
                        <span>🧹 Gộp dòng thừa</span>
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400">Có thể kéo giãn góc dưới</span>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Nhập nội dung đề bài câu hỏi trắc nghiệm, bài toán, công thức..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 leading-relaxed min-h-[110px] resize-y"
                />
              </div>

              {/* 4 Options */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Danh Sách 4 Phương Án:
                </label>
                <div className="space-y-2">
                  {editOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                        opt.is_correct
                          ? "border-emerald-500 bg-emerald-50/40"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditOptions((prev) =>
                            prev.map((o, i) => ({ ...o, is_correct: i === idx }))
                          );
                        }}
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer ${
                          opt.is_correct
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {opt.option_label}
                      </button>

                      <input
                        type="text"
                        value={opt.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditOptions((prev) =>
                            prev.map((o, i) => (i === idx ? { ...o, content: val } : o))
                          );
                        }}
                        className="flex-1 text-xs py-1.5 px-2 bg-transparent focus:outline-none"
                      />

                      {opt.is_correct && (
                        <span className="text-[11px] font-bold text-emerald-600 mr-2">
                          ✓ Đúng
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Lời Giải Thích Chi Tiết
                  </label>
                  <div className="flex items-center gap-2">
                    {editExplanation.includes("\n") && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditExplanation((prev) =>
                            prev
                              .split("\n")
                              .map((l) => l.trim())
                              .filter(Boolean)
                              .join(" ")
                          );
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 px-2 py-0.5 rounded-md font-medium transition flex items-center gap-1 cursor-pointer"
                        title="Gộp các dòng bị ngắt rời rạc thành một đoạn liền mạch"
                      >
                        <span>🧹 Gộp dòng thừa</span>
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400">Không bắt buộc • Có thể kéo giãn</span>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  placeholder="Nhập các bước giải chi tiết hoặc lưu ý phương pháp giải..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 leading-relaxed min-h-[100px] resize-y"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl cursor-pointer"
                >
                  {isEditSubmitting ? "Đang lưu..." : "Lưu Cập Nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL 4: XÁC NHẬN XÓA (Tiêu chí 6) */}
      {/* ========================================================================= */}
      {deletingQuestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-xl p-5 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-2 text-xl">
                🗑️
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Xác Nhận Xóa Câu Hỏi?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa câu hỏi này khỏi gói ngân hàng không? Hành động này không thể hoàn tác.
              </p>
            </div>

            {deleteQuestionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs leading-relaxed">
                {deleteQuestionError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingQuestionId(null);
                  setDeleteQuestionError("");
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl cursor-pointer"
              >
                {isDeleting ? "Đang xóa..." : "Xác Nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: XÁC NHẬN XÓA MÔN HỌC */}
      {/* ========================================================================= */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center text-2xl mx-auto">
              🗑️
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Xóa Môn Học
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Môn học: <span className="font-semibold text-slate-800 dark:text-slate-200">{deletingSubject.subject_name}</span>
              </p>
            </div>

            {deleteSubjectError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs leading-relaxed">
                {deleteSubjectError}
              </div>
            )}

            {(deletingSubject.questionCount || 0) > 0 ? (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-1.5">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <span>⚠️</span> Không thể xóa môn học đang chứa câu hỏi
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Môn học này hiện đang chứa <strong>{deletingSubject.questionCount} câu hỏi</strong> trong {deletingSubject.topicCount || 0} chuyên đề. Để tránh làm mất tài liệu luyện thi của giáo viên, vui lòng xóa hoặc chuyển toàn bộ câu hỏi trước khi xóa môn học.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center leading-relaxed">
                Môn học này hiện không chứa câu hỏi nào. Bạn có chắc chắn muốn xóa môn học này không? Tất cả chuyên đề trống thuộc môn này cũng sẽ được dọn dẹp.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingSubject(null);
                  setDeleteSubjectError("");
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                {(deletingSubject.questionCount || 0) > 0 ? "Đã hiểu & Đóng" : "Hủy bỏ"}
              </button>

              {(deletingSubject.questionCount || 0) === 0 && (
                <button
                  type="button"
                  onClick={handleConfirmDeleteSubject}
                  disabled={isDeletingSubject}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl cursor-pointer"
                >
                  {isDeletingSubject ? "Đang xóa..." : "Xác Nhận Xóa"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: XÁC NHẬN XÓA CHUYÊN ĐỀ */}
      {/* ========================================================================= */}
      {deletingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center text-2xl mx-auto">
              🗑️
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Xóa Chuyên Đề
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Chuyên đề: <span className="font-semibold text-slate-800 dark:text-slate-200">{deletingTopic.topic_name}</span>
              </p>
            </div>

            {deleteTopicError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs leading-relaxed">
                {deleteTopicError}
              </div>
            )}

            {(deletingTopic.questionCount || 0) > 0 ? (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-1.5">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <span>⚠️</span> Không thể xóa chuyên đề đang chứa câu hỏi
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Chuyên đề này hiện đang chứa <strong>{deletingTopic.questionCount} câu hỏi</strong>. Để bảo vệ dữ liệu ôn thi, hệ thống không cho phép xóa chuyên đề khi vẫn còn câu hỏi. Vui lòng mở gói để xóa các câu hỏi trước.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center leading-relaxed">
                Chuyên đề này hiện trống (0 câu hỏi). Bạn có chắc chắn muốn xóa chuyên đề này khỏi môn học không?
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingTopic(null);
                  setDeleteTopicError("");
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                {(deletingTopic.questionCount || 0) > 0 ? "Đã hiểu & Đóng" : "Hủy bỏ"}
              </button>

              {(deletingTopic.questionCount || 0) === 0 && (
                <button
                  type="button"
                  onClick={handleConfirmDeleteTopic}
                  disabled={isDeletingTopic}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl cursor-pointer"
                >
                  {isDeletingTopic ? "Đang xóa..." : "Xác Nhận Xóa"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
