"use client";

import React, { useState, useEffect, useMemo } from "react";
import QuestionCreationModal from "@/components/questions/question-creation-modal";
import Link from "next/link";

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
  // "subjects": xem danh mục các môn học
  // "topics": xem danh sách chuyên đề phân cấp trong môn đã chọn
  // "questions": xem danh sách câu hỏi chi tiết trong chuyên đề đã chọn
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
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

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

  // Reload questions whenever selectedTopic or filters change
  useEffect(() => {
    if (viewLevel !== "questions" || !selectedTopic) return;

    let ignore = false;

    const params = new URLSearchParams();
    params.set("topic_id", selectedTopic._id);
    if (selectedDifficulty !== "all") params.set("difficulty", selectedDifficulty);
    if (selectedSource === "ai") params.set("is_ai_generated", "true");
    if (selectedSource === "manual") params.set("is_ai_generated", "false");
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

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
            depth === 0 ? "• " : `${"\u00A0\u00A0\u00A0\u00A0".repeat(depth)}↳ `;
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

  // Permission helpers
  function canManageSubject(subject: SubjectItem): boolean {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (!subject.created_by) return false;
    const creatorId =
      typeof subject.created_by === "string"
        ? subject.created_by
        : subject.created_by._id;
    return creatorId === currentUser.id;
  }

  function canManageTopic(topic: TopicItem): boolean {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (!topic.created_by) return false;
    const creatorId =
      typeof topic.created_by === "string"
        ? topic.created_by
        : topic.created_by._id;
    return creatorId === currentUser.id;
  }

  // Drill-down navigation handlers
  function handleSelectSubject(subject: SubjectItem) {
    setSelectedSubject(subject);
    setSelectedTopic(null);
    setViewLevel("topics");
  }

  function handleSelectTopic(topic: TopicItem) {
    setSelectedTopic(topic);
    setViewLevel("questions");
  }

  function handleBackToSubjects() {
    setSelectedSubject(null);
    setSelectedTopic(null);
    setViewLevel("subjects");
  }

  function handleBackToTopics() {
    setSelectedTopic(null);
    setViewLevel("topics");
  }

  function toggleExplanation(qId: string) {
    setExpandedExplanations((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  }

  // Confirm delete question
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
        setDeleteQuestionError(data.message || "Không thể xóa câu hỏi này.");
      }
    } catch {
      setDeleteQuestionError("Lỗi kết nối khi xóa câu hỏi.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Confirm delete subject
  async function handleConfirmDeleteSubject() {
    if (!deletingSubject) return;
    setIsDeletingSubject(true);
    setDeleteSubjectError("");

    try {
      const res = await fetch(`/api/instructor/subjects/${deletingSubject._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSubjects((prev) => prev.filter((s) => s._id !== deletingSubject._id));
        setTopics((prev) => prev.filter((t) => String(t.subject_id) !== String(deletingSubject._id)));
        setDeletingSubject(null);
        if (selectedSubject?._id === deletingSubject._id) {
          handleBackToSubjects();
        }
      } else {
        setDeleteSubjectError(data.message || "Không thể xóa môn học này.");
      }
    } catch {
      setDeleteSubjectError("Lỗi kết nối khi xóa môn học.");
    } finally {
      setIsDeletingSubject(false);
    }
  }

  // Confirm delete topic
  async function handleConfirmDeleteTopic() {
    if (!deletingTopic) return;
    setIsDeletingTopic(true);
    setDeleteTopicError("");

    try {
      const res = await fetch(`/api/instructor/topics/${deletingTopic._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setTopics((prev) => prev.filter((t) => t._id !== deletingTopic._id));
        setDeletingTopic(null);
        if (selectedTopic?._id === deletingTopic._id) {
          handleBackToTopics();
        }
        reloadMetadata();
      } else {
        setDeleteTopicError(data.message || "Không thể xóa chuyên đề này.");
      }
    } catch {
      setDeleteTopicError("Lỗi kết nối khi xóa chuyên đề.");
    } finally {
      setIsDeletingTopic(false);
    }
  }

  // Open Edit Modal
  function handleOpenEdit(q: QuestionItem) {
    setEditingId(q._id);
    const resolvedTopicId = typeof q.topic_id === "object" && q.topic_id?._id
      ? q.topic_id._id
      : (typeof q.topic_id === "string" ? q.topic_id : selectedTopic?._id || "");
    setEditTopicId(resolvedTopicId);
    setEditContent(q.content);
    setEditDifficulty(q.difficulty_level);
    setEditExplanation(q.explanation || "");
    setEditOptions(
      q.options.map((opt, i) => ({
        option_label: opt.option_label || ["A", "B", "C", "D"][i] || "",
        content: opt.content,
        is_correct: opt.is_correct,
      }))
    );
    setEditFormError("");
    setIsEditModalOpen(true);
  }

  // Save Edit
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    if (!editContent.trim()) {
      setEditFormError("Nội dung câu hỏi không được để trống.");
      return;
    }

    const hasEmptyOption = editOptions.some((o) => !o.content.trim());
    if (hasEmptyOption) {
      setEditFormError("Tất cả 4 phương án trắc nghiệm đều phải có nội dung.");
      return;
    }

    const correctCount = editOptions.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      setEditFormError("Phải có chính xác 1 phương án là đáp án đúng.");
      return;
    }

    setIsEditSubmitting(true);
    setEditFormError("");

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
      if (data.success && data.question) {
        setQuestions((prev) =>
          prev.map((q) => (q._id === editingId ? data.question : q))
        );
        setIsEditModalOpen(false);
        reloadMetadata();
      } else {
        setEditFormError(data.message || "Cập nhật câu hỏi thất bại.");
      }
    } catch {
      setEditFormError("Lỗi kết nối máy chủ khi lưu câu hỏi.");
    } finally {
      setIsEditSubmitting(false);
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
      {/* Breadcrumb Trail (Linear / Vercel minimalist navigation) */}
      <div className="border border-slate-200/80 dark:border-slate-800 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-between">
        <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={handleBackToSubjects}
            className={`inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer ${
              viewLevel === "subjects"
                ? "text-slate-900 dark:text-white font-semibold"
                : ""
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Kho Môn Học</span>
          </button>

          {selectedSubject && (
            <>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <button
                type="button"
                onClick={handleBackToTopics}
                className={`inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer ${
                  viewLevel === "topics"
                    ? "text-slate-900 dark:text-white font-semibold"
                    : ""
                }`}
              >
                <span>{selectedSubject.subject_name}</span>
              </button>
            </>
          )}

          {selectedTopic && (
            <>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-slate-900 dark:text-white font-semibold truncate max-w-[280px]">
                {selectedTopic.topic_name}
              </span>
            </>
          )}
        </nav>

        {viewLevel === "topics" && selectedSubject && (
          <button
            type="button"
            onClick={() => {
              const firstTopic = topics.find((t) => String(t.subject_id) === String(selectedSubject._id));
              handleOpenAddModal(firstTopic?._id || "", "manual");
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-medium hover:opacity-90 transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Soạn câu hỏi mới</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TẦNG 1: DANH MỤC CÁC GÓI MÔN HỌC (Level: "subjects") */}
      {/* ========================================================================= */}
      {viewLevel === "subjects" && (
        <div className="space-y-6">
          {/* 3 Metrics Bar */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800">
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Môn học khảo thí</p>
                  <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                    {overallStats.totalSubjects}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Chuyên đề kiến thức</p>
                  <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                    {overallStats.totalTopics}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Tổng câu hỏi trong kho</p>
                  <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                    {overallStats.totalQuestions}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* List of Subjects */}
          {isLoadingMetadata ? (
            <div className="py-20 text-center border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
              <div className="w-6 h-6 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
              <p className="text-xs text-slate-500">Đang tải danh mục môn học...</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Kho Môn Học Đang Quản Lý
                  </h3>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Chọn một môn để truy cập cây chuyên đề và kho câu hỏi chi tiết
                  </span>
                </div>
                <Link
                  href={currentUser?.role === "admin" ? "/admin/subjects" : "/instructor/subjects"}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                >
                  Quản lý cây chủ đề →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((sub, sIdx) => {
                  return (
                    <div
                      key={sub._id}
                      onClick={() => handleSelectSubject(sub)}
                      className="group border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900 p-5 rounded-xl cursor-pointer transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {sub.code || `MÔN-${sIdx + 1}`}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {sub.created_by && (
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  canManageSubject(sub)
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    : "bg-slate-50 dark:bg-slate-850 text-slate-400"
                                }`}
                              >
                                {canManageSubject(sub) ? "Của tôi" : "Hệ thống"}
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
                                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Card Content */}
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {sub.subject_name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {sub.description || "Kho câu hỏi chuẩn thi THPT theo cấu trúc ma trận của Bộ GD&ĐT."}
                        </p>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          <strong className="text-slate-900 dark:text-white font-medium">{sub.topicCount || 0}</strong> chuyên đề • <strong className="text-slate-900 dark:text-white font-medium">{sub.questionCount || 0}</strong> câu hỏi
                        </span>
                        <span className="text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all text-xs font-medium">
                          →
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
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToSubjects}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Quay lại danh mục môn học"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Môn: {selectedSubject.subject_name}
                  </h3>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {currentSubjectTopics.length} chuyên đề
                  </span>
                  {canManageSubject(selectedSubject) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingSubject(selectedSubject);
                        setDeleteSubjectError("");
                      }}
                      className="text-xs font-medium text-slate-400 hover:text-rose-600 transition cursor-pointer ml-1"
                      title="Xóa môn học này"
                    >
                      Xóa môn
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chọn chuyên đề để xem danh sách câu hỏi hoặc sử dụng AI để tự động tạo câu hỏi trắc nghiệm
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={currentUser?.role === "admin" ? "/admin/subjects" : "/instructor/subjects"}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Quản lý cây chủ đề
              </Link>
            </div>
          </div>

          {/* Hierarchical Knowledge Tree */}
          {subjectTopicTree.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6">
              <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Chưa có gói chuyên đề nào trong môn này.
              </p>
              <Link
                href={currentUser?.role === "admin" ? "/admin/subjects" : "/instructor/subjects"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-medium hover:opacity-90 transition cursor-pointer"
              >
                <span>+</span> Thêm chuyên đề trong Cây Chủ Đề
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectTopicTree.map((rootNode, rIdx) => {
                function renderTopicBranch(node: TopicTreeNode, depth: number, idxLabel: string) {
                  const hasKids = node.children.length > 0;
                  const directCount = node.stats?.total ?? node.questionCount ?? 0;

                  return (
                    <div key={node._id} className="space-y-2">
                      <div
                        onClick={() => handleSelectTopic(node)}
                        className={`group border cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          depth === 0
                            ? "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 p-4 sm:p-5 rounded-xl"
                            : "bg-slate-50/70 dark:bg-slate-850/40 border-slate-200/70 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 p-3.5 rounded-lg"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            {depth === 0 && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                Chương {idxLabel}
                              </span>
                            )}

                            <h4
                              className={`font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                                depth === 0 ? "text-sm sm:text-base" : "text-xs sm:text-sm"
                              }`}
                            >
                              {node.topic_name}
                            </h4>

                            {hasKids && (
                              <span className="text-[11px] text-slate-400">
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
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {node.subtreeQuestionCount} câu hỏi
                              {hasKids && directCount !== node.subtreeQuestionCount
                                ? ` (trực tiếp: ${directCount})`
                                : ""}
                            </span>
                            <span>•</span>
                            <span>Dễ: {node.subtreeStats.easy}</span>
                            <span>•</span>
                            <span>TB: {node.subtreeStats.medium}</span>
                            <span>•</span>
                            <span>Khó: {node.subtreeStats.hard}</span>
                          </div>
                        </div>

                        <div
                          className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenAddModal(node._id, "ai")}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1.5"
                            title={`AI tự động sinh câu hỏi theo bài "${node.topic_name}"`}
                          >
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>AI Sinh Đề</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectTopic(node)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition cursor-pointer flex items-center gap-1"
                          >
                            <span>Mở chuyên đề</span>
                            <span>→</span>
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
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {hasKids && (
                        <div className="ml-4 sm:ml-6 pl-3 sm:pl-4 border-l border-slate-200 dark:border-slate-800 space-y-2">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToTopics}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Quay lại danh sách chuyên đề"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    {selectedSubject?.subject_name}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-xs font-medium text-slate-500">
                    {questions.length} câu hỏi
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {selectedTopic.topic_name}
                  </h3>
                  {canManageTopic(selectedTopic) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingTopic(selectedTopic);
                        setDeleteTopicError("");
                      }}
                      className="text-xs font-medium text-slate-400 hover:text-rose-600 transition cursor-pointer ml-1"
                      title="Xóa chuyên đề này"
                    >
                      Xóa chuyên đề
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenAddModal(selectedTopic._id, "ai")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition cursor-pointer"
                title="Dùng AI tự động sinh câu hỏi theo bài này"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>AI Sinh Đề</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddModal(selectedTopic._id, "manual")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Soạn / Nạp Tệp</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") reloadQuestionsList();
                }}
                placeholder="Tìm kiếm câu hỏi trong chuyên đề này (nhấn Enter)..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Tất cả độ khó</option>
                <option value="easy">Dễ (Nhận biết)</option>
                <option value="medium">Trung bình (Thông hiểu)</option>
                <option value="hard">Khó (Vận dụng cao)</option>
              </select>

              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Tất cả nguồn</option>
                <option value="ai">Do AI tạo</option>
                <option value="manual">Giáo viên soạn</option>
              </select>
            </div>
          </div>

          {/* List of Questions */}
          {isLoadingQuestions ? (
            <div className="py-20 text-center border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
              <div className="w-6 h-6 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
              <p className="text-xs text-slate-500">Đang tải câu hỏi trong chuyên đề...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-6">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Chuyên đề này chưa có câu hỏi nào thỏa mãn bộ lọc.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal(selectedTopic._id, "ai")}
                  className="px-3 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-medium rounded-lg hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>AI Sinh Đề Tự Động</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddModal(selectedTopic._id, "manual")}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  + Soạn Thủ Công / Nạp Tệp
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {questions.map((q, idx) => {
                const isExpanded = !!expandedExplanations[q._id];
                return (
                  <div
                    key={q._id}
                    className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Câu {idx + 1}
                        </span>

                        {q.difficulty_level === "easy" && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                            Nhận biết (Dễ)
                          </span>
                        )}
                        {q.difficulty_level === "medium" && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                            Thông hiểu (TB)
                          </span>
                        )}
                        {q.difficulty_level === "hard" && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                            Vận dụng cao (Khó)
                          </span>
                        )}

                        {q.is_ai_generated ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>AI sinh</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-500 dark:bg-slate-850 dark:text-slate-400">
                            Giáo viên soạn
                          </span>
                        )}
                      </div>

                      {/* Action buttons: Edit & Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(q)}
                          className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingQuestionId(q._id)}
                          className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="text-slate-900 dark:text-slate-100 font-medium text-sm leading-relaxed mb-4 whitespace-pre-line">
                      {q.content}
                    </div>

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition ${
                            opt.is_correct
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200"
                              : "border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center font-semibold text-xs shrink-0 ${
                              opt.is_correct
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {opt.option_label || ["A", "B", "C", "D"][oIdx]}
                          </span>
                          <div className="flex-1 pt-0.5 min-w-0">
                            <span className="leading-relaxed">{opt.content}</span>
                            {opt.is_correct && (
                              <span className="ml-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                (Đáp án đúng)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => toggleExplanation(q._id)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition"
                        >
                          <span>{isExpanded ? "▲ Thu gọn lời giải" : "▼ Xem lời giải chi tiết"}</span>
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            <span className="font-semibold text-slate-900 dark:text-white block mb-1">
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
          key={`${targetCreationTopicId}-${addModalTab}-${selectedSubject?._id || ""}`}
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          subjects={subjects}
          topics={topics}
          currentSubjectId={selectedSubject?._id}
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
      {/* MODAL 2: SỬA CÂU HỎI */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-xl shadow-xl overflow-hidden my-8">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Chỉnh Sửa Câu Hỏi Trắc Nghiệm
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cập nhật đề bài, 4 phương án trắc nghiệm và lời giải thích
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 space-y-4">
              {editFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {editFormError}
                </div>
              )}

              {/* Topic & Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gói Chuyên Đề
                  </label>
                  <select
                    value={editTopicId}
                    onChange={(e) => setEditTopicId(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  >
                    {(selectedSubject
                      ? groupedAllTopicOptions.filter((g) => String(g.subject_id) === String(selectedSubject._id))
                      : groupedAllTopicOptions
                    ).map((group) =>
                      group.items.length > 0 ? (
                        <optgroup key={group.subject_id} label={`Môn: ${group.subject_name}`}>
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
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mức Độ Khó
                  </label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value as "easy" | "medium" | "hard")}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
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
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
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
                        className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded font-medium transition cursor-pointer"
                        title="Gộp các dòng bị ngắt rời rạc thành một dòng liền mạch"
                      >
                        Gộp dòng thừa
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400">Kéo góc dưới để mở rộng</span>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Nhập nội dung đề bài câu hỏi trắc nghiệm, bài toán, công thức..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 leading-relaxed min-h-[110px] resize-y"
                />
              </div>

              {/* 4 Options */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  4 Phương Án Trắc Nghiệm:
                </label>
                <div className="space-y-2">
                  {editOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                        opt.is_correct
                          ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
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
                        className={`w-6 h-6 rounded text-xs font-semibold flex items-center justify-center shrink-0 cursor-pointer ${
                          opt.is_correct
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
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
                        className="flex-1 text-xs py-1 px-2 bg-transparent text-slate-900 dark:text-white focus:outline-none"
                      />

                      {opt.is_correct && (
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mr-2">
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
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
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
                        className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded font-medium transition cursor-pointer"
                        title="Gộp các dòng bị ngắt rời rạc thành một đoạn liền mạch"
                      >
                        Gộp dòng thừa
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400">Không bắt buộc</span>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  placeholder="Nhập các bước giải chi tiết hoặc lưu ý phương pháp giải..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 leading-relaxed min-h-[100px] resize-y"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  {isEditSubmitting ? "Đang lưu..." : "Lưu Cập Nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: XÁC NHẬN XÓA CÂU HỎI */}
      {/* ========================================================================= */}
      {deletingQuestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-xl shadow-xl p-5 space-y-4">
            <div className="text-center">
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-lg flex items-center justify-center mx-auto mb-2.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Xác Nhận Xóa Câu Hỏi?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa câu hỏi này khỏi kho ngân hàng không? Hành động này không thể hoàn tác.
              </p>
            </div>

            {deleteQuestionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs leading-relaxed">
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
                className="flex-1 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                {isDeleting ? "Đang xóa..." : "Xác Nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: XÁC NHẬN XÓA MÔN HỌC */}
      {/* ========================================================================= */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-xl shadow-xl overflow-hidden p-5 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div className="text-center">
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Xóa Môn Học
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Môn học: <span className="font-medium text-slate-800 dark:text-slate-200">{deletingSubject.subject_name}</span>
              </p>
            </div>

            {deleteSubjectError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs leading-relaxed">
                {deleteSubjectError}
              </div>
            )}

            {(deletingSubject.questionCount || 0) > 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg space-y-1">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Không thể xóa môn học đang chứa câu hỏi
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Môn học này hiện đang chứa <strong>{deletingSubject.questionCount} câu hỏi</strong> trong {deletingSubject.topicCount || 0} chuyên đề. Vui lòng xóa hoặc chuyển toàn bộ câu hỏi trước khi xóa môn học.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                Môn học này hiện không chứa câu hỏi nào. Bạn có chắc chắn muốn xóa môn học này không?
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingSubject(null);
                  setDeleteSubjectError("");
                }}
                className="flex-1 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                {(deletingSubject.questionCount || 0) > 0 ? "Đã hiểu & Đóng" : "Hủy bỏ"}
              </button>

              {(deletingSubject.questionCount || 0) === 0 && (
                <button
                  type="button"
                  onClick={handleConfirmDeleteSubject}
                  disabled={isDeletingSubject}
                  className="flex-1 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  {isDeletingSubject ? "Đang xóa..." : "Xác Nhận Xóa"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: XÁC NHẬN XÓA CHUYÊN ĐỀ */}
      {/* ========================================================================= */}
      {deletingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-xl shadow-xl overflow-hidden p-5 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div className="text-center">
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Xóa Chuyên Đề
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Chuyên đề: <span className="font-medium text-slate-800 dark:text-slate-200">{deletingTopic.topic_name}</span>
              </p>
            </div>

            {deleteTopicError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs leading-relaxed">
                {deleteTopicError}
              </div>
            )}

            {(deletingTopic.questionCount || 0) > 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg space-y-1">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Không thể xóa chuyên đề đang chứa câu hỏi
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Chuyên đề này hiện đang chứa <strong>{deletingTopic.questionCount} câu hỏi</strong>. Vui lòng mở chuyên đề để xóa các câu hỏi trước khi xóa chuyên đề.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
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
                className="flex-1 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                {(deletingTopic.questionCount || 0) > 0 ? "Đã hiểu & Đóng" : "Hủy bỏ"}
              </button>

              {(deletingTopic.questionCount || 0) === 0 && (
                <button
                  type="button"
                  onClick={handleConfirmDeleteTopic}
                  disabled={isDeletingTopic}
                  className="flex-1 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg cursor-pointer"
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
