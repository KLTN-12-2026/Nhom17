"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

export interface KnowledgeUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "admin" | "instructor" | "student";
}

export interface SubjectItem {
  _id: string;
  subject_name: string;
  description?: string;
  created_by?: { _id: string; name?: string; email?: string } | string | null;
  topicCount?: number;
  questionCount?: number;
  aiQuestionCount?: number;
  createdAt?: string;
}

export interface TopicStats {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  aiCount?: number;
}

export interface TopicItem {
  _id: string;
  subject_id: string;
  parent_id?: string | null;
  topic_name: string;
  description?: string;
  level: number;
  created_by?: { _id: string; name?: string; email?: string } | string | null;
  questionCount?: number;
  stats?: TopicStats;
  createdAt?: string;
}

interface TopicTreeNode extends TopicItem {
  children: TopicTreeNode[];
  subtreeQuestionCount: number;
  subtreeStats: TopicStats;
}

interface KnowledgeTreeManagerProps {
  initialSubjects: SubjectItem[];
  initialTopics: TopicItem[];
  currentUser: KnowledgeUser;
}

export default function KnowledgeTreeManager({
  initialSubjects,
  initialTopics,
  currentUser,
}: KnowledgeTreeManagerProps) {
  const [subjects, setSubjects] = useState<SubjectItem[]>(initialSubjects);
  const [topics, setTopics] = useState<TopicItem[]>(initialTopics);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected subject
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    () => initialSubjects[0]?._id || ""
  );

  // Search & filters
  const [subjectSearch, setSubjectSearch] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Toast notification
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  }

  // Subject Modal (Create / Edit)
  const [subjectModalMode, setSubjectModalMode] = useState<"create" | "edit" | null>(null);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [subjectNameInput, setSubjectNameInput] = useState("");
  const [subjectDescInput, setSubjectDescInput] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [isSubjectSaving, setIsSubjectSaving] = useState(false);

  // Delete Subject Modal
  const [deletingSubject, setDeletingSubject] = useState<SubjectItem | null>(null);
  const [deleteSubjectError, setDeleteSubjectError] = useState("");
  const [isSubjectDeleting, setIsSubjectDeleting] = useState(false);

  // Topic Modal (Create / Edit)
  const [topicModalMode, setTopicModalMode] = useState<"create" | "edit" | null>(null);
  const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null);
  const [topicNameInput, setTopicNameInput] = useState("");
  const [topicDescInput, setTopicDescInput] = useState("");
  const [topicParentIdInput, setTopicParentIdInput] = useState<string>("");
  const [topicError, setTopicError] = useState("");
  const [isTopicSaving, setIsTopicSaving] = useState(false);

  // Delete Topic Modal
  const [deletingTopic, setDeletingTopic] = useState<TopicTreeNode | null>(null);
  const [deleteTopicError, setDeleteTopicError] = useState("");
  const [isTopicDeleting, setIsTopicDeleting] = useState(false);

  // Reload metadata from API
  async function reloadData(selectSubId?: string) {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/instructor/subjects");
      const data = await res.json();
      if (data.success) {
        const nextSubjects: SubjectItem[] = data.subjects || [];
        const nextTopics: TopicItem[] = data.topics || [];
        setSubjects(nextSubjects);
        setTopics(nextTopics);

        if (selectSubId) {
          setSelectedSubjectId(selectSubId);
        } else if (
          selectedSubjectId &&
          !nextSubjects.some((s) => s._id === selectedSubjectId)
        ) {
          setSelectedSubjectId(nextSubjects[0]?._id || "");
        } else if (!selectedSubjectId && nextSubjects.length > 0) {
          setSelectedSubjectId(nextSubjects[0]._id);
        }
      }
    } catch (err) {
      console.error("Lỗi khi tải lại danh mục kiến thức:", err);
    } finally {
      setIsRefreshing(false);
    }
  }

  // Permission helpers
  function canManageSubject(sub: SubjectItem): boolean {
    if (currentUser.role === "admin") return true;
    if (!sub.created_by) return true;
    const creatorId =
      typeof sub.created_by === "object" ? sub.created_by?._id : sub.created_by;
    return String(creatorId) === String(currentUser.id);
  }

  function canManageTopic(top: TopicItem): boolean {
    if (currentUser.role === "admin") return true;
    if (!top.created_by) return true;
    const creatorId =
      typeof top.created_by === "object" ? top.created_by?._id : top.created_by;
    return String(creatorId) === String(currentUser.id);
  }

  function getCreatorLabel(
    createdBy?: { _id: string; name?: string; email?: string } | string | null
  ): string {
    if (!createdBy) return "Hệ thống";
    if (typeof createdBy === "object") {
      return createdBy.name || createdBy.email || "Giảng viên";
    }
    return "Giảng viên";
  }

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.subject_name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [subjects, subjectSearch]);

  // Selected subject object
  const selectedSubject = useMemo(
    () => subjects.find((s) => s._id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

  // Topics of current subject
  const subjectTopics = useMemo(() => {
    if (!selectedSubjectId) return [];
    return topics.filter((t) => String(t.subject_id) === String(selectedSubjectId));
  }, [topics, selectedSubjectId]);

  // Build hierarchical tree for current subject
  const topicTree = useMemo(() => {
    const nodeMap = new Map<string, TopicTreeNode>();

    for (const t of subjectTopics) {
      const baseStats: TopicStats = t.stats || {
        total: t.questionCount || 0,
        easy: 0,
        medium: 0,
        hard: 0,
        aiCount: 0,
      };
      nodeMap.set(String(t._id), {
        ...t,
        children: [],
        subtreeQuestionCount: baseStats.total,
        subtreeStats: { ...baseStats },
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

    // Aggregate subtree question counts bottom-up
    function aggregateSubtree(node: TopicTreeNode): TopicStats {
      const agg: TopicStats = {
        total: node.stats?.total ?? node.questionCount ?? 0,
        easy: node.stats?.easy ?? 0,
        medium: node.stats?.medium ?? 0,
        hard: node.stats?.hard ?? 0,
        aiCount: node.stats?.aiCount ?? 0,
      };
      node.children.sort((a, b) => a.topic_name.localeCompare(b.topic_name, "vi"));
      for (const child of node.children) {
        const childStats = aggregateSubtree(child);
        agg.total += childStats.total;
        agg.easy += childStats.easy;
        agg.medium += childStats.medium;
        agg.hard += childStats.hard;
        agg.aiCount = (agg.aiCount || 0) + (childStats.aiCount || 0);
      }
      node.subtreeQuestionCount = agg.total;
      node.subtreeStats = agg;
      return agg;
    }

    roots.sort((a, b) => a.topic_name.localeCompare(b.topic_name, "vi"));
    for (const r of roots) {
      aggregateSubtree(r);
    }

    // Filter tree if topicSearch is active
    const q = topicSearch.trim().toLowerCase();
    if (!q) return roots;

    function filterNode(node: TopicTreeNode): TopicTreeNode | null {
      const matchesSelf =
        node.topic_name.toLowerCase().includes(q) ||
        (node.description && node.description.toLowerCase().includes(q));

      const filteredChildren = node.children
        .map(filterNode)
        .filter((c): c is TopicTreeNode => c !== null);

      if (matchesSelf || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    }

    return roots.map(filterNode).filter((n): n is TopicTreeNode => n !== null);
  }, [subjectTopics, topicSearch]);

  // Flatten tree for Parent Topic select dropdown (excluding current editing topic and its descendants)
  const parentTopicOptions = useMemo(() => {
    const excludedIds = new Set<string>();
    if (topicModalMode === "edit" && editingTopic) {
      excludedIds.add(String(editingTopic._id));
      // Collect descendants
      const queue = [String(editingTopic._id)];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const t of subjectTopics) {
          if (t.parent_id && String(t.parent_id) === curr && !excludedIds.has(String(t._id))) {
            excludedIds.add(String(t._id));
            queue.push(String(t._id));
          }
        }
      }
    }

    const result: { _id: string; label: string; level: number }[] = [];
    function traverse(nodes: TopicTreeNode[], depth: number) {
      for (const n of nodes) {
        if (excludedIds.has(String(n._id))) continue;
        const prefix = depth > 0 ? `${"── ".repeat(depth)}` : "";
        result.push({
          _id: n._id,
          label: `${prefix}${n.topic_name} (Cấp ${n.level})`,
          level: n.level,
        });
        if (n.children.length > 0) {
          traverse(n.children, depth + 1);
        }
      }
    }
    traverse(topicTree, 0);
    return result;
  }, [topicTree, topicModalMode, editingTopic, subjectTopics]);

  // Overall KPI stats
  const kpiStats = useMemo(() => {
    const totalSubjects = subjects.length;
    const totalTopics = topics.length;
    const rootTopics = topics.filter((t) => !t.parent_id).length;
    const subTopics = totalTopics - rootTopics;
    const totalQuestions = subjects.reduce((sum, s) => sum + (s.questionCount || 0), 0);
    const totalAiQuestions = subjects.reduce((sum, s) => sum + (s.aiQuestionCount || 0), 0);
    return {
      totalSubjects,
      totalTopics,
      rootTopics,
      subTopics,
      totalQuestions,
      totalAiQuestions,
    };
  }, [subjects, topics]);

  // Expand / Collapse helpers
  function toggleCollapse(topicId: string) {
    setCollapsedNodes((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  }

  function expandAll() {
    setCollapsedNodes({});
  }

  function collapseAll() {
    const next: Record<string, boolean> = {};
    for (const t of subjectTopics) {
      next[t._id] = true;
    }
    setCollapsedNodes(next);
  }

  // --- SUBJECT ACTIONS ---
  function openCreateSubjectModal() {
    setSubjectModalMode("create");
    setEditingSubject(null);
    setSubjectNameInput("");
    setSubjectDescInput("");
    setSubjectError("");
  }

  function openEditSubjectModal(sub: SubjectItem) {
    setSubjectModalMode("edit");
    setEditingSubject(sub);
    setSubjectNameInput(sub.subject_name);
    setSubjectDescInput(sub.description || "");
    setSubjectError("");
  }

  async function handleSaveSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectNameInput.trim()) {
      setSubjectError("Vui lòng nhập tên môn học.");
      return;
    }

    setIsSubjectSaving(true);
    setSubjectError("");
    try {
      const isEdit = subjectModalMode === "edit" && editingSubject;
      const url = isEdit
        ? `/api/instructor/subjects/${editingSubject._id}`
        : "/api/instructor/subjects";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_name: subjectNameInput.trim(),
          description: subjectDescInput.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSubjectModalMode(null);
        showToast("success", data.message || "Lưu môn học thành công!");
        await reloadData(data.subject?._id || selectedSubjectId);
      } else {
        setSubjectError(data.message || "Không thể lưu môn học.");
      }
    } catch {
      setSubjectError("Lỗi kết nối máy chủ khi lưu môn học.");
    } finally {
      setIsSubjectSaving(false);
    }
  }

  async function handleConfirmDeleteSubject() {
    if (!deletingSubject) return;
    setIsSubjectDeleting(true);
    setDeleteSubjectError("");
    try {
      const res = await fetch(`/api/instructor/subjects/${deletingSubject._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDeletingSubject(null);
        showToast("success", data.message || "Đã xóa môn học!");
        await reloadData();
      } else {
        setDeleteSubjectError(data.message || "Không thể xóa môn học.");
      }
    } catch {
      setDeleteSubjectError("Lỗi kết nối máy chủ khi xóa môn học.");
    } finally {
      setIsSubjectDeleting(false);
    }
  }

  // --- TOPIC ACTIONS ---
  function openCreateTopicModal(parentId: string | null = null) {
    if (!selectedSubjectId) return;
    setTopicModalMode("create");
    setEditingTopic(null);
    setTopicNameInput("");
    setTopicDescInput("");
    setTopicParentIdInput(parentId || "");
    setTopicError("");
  }

  function openEditTopicModal(top: TopicItem) {
    setTopicModalMode("edit");
    setEditingTopic(top);
    setTopicNameInput(top.topic_name);
    setTopicDescInput(top.description || "");
    setTopicParentIdInput(top.parent_id ? String(top.parent_id) : "");
    setTopicError("");
  }

  async function handleSaveTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topicNameInput.trim()) {
      setTopicError("Vui lòng nhập tên chủ đề / chuyên đề.");
      return;
    }

    setIsTopicSaving(true);
    setTopicError("");
    try {
      const isEdit = topicModalMode === "edit" && editingTopic;
      const url = isEdit
        ? `/api/instructor/topics/${editingTopic._id}`
        : "/api/instructor/topics";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: selectedSubjectId,
          parent_id: topicParentIdInput ? topicParentIdInput : null,
          topic_name: topicNameInput.trim(),
          description: topicDescInput.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        if (topicParentIdInput) {
          setCollapsedNodes((prev) => ({ ...prev, [topicParentIdInput]: false }));
        }
        setTopicModalMode(null);
        showToast("success", data.message || "Lưu chuyên đề thành công!");
        await reloadData(selectedSubjectId);
      } else {
        setTopicError(data.message || "Không thể lưu chuyên đề.");
      }
    } catch {
      setTopicError("Lỗi kết nối máy chủ khi lưu chuyên đề.");
    } finally {
      setIsTopicSaving(false);
    }
  }

  async function handleConfirmDeleteTopic() {
    if (!deletingTopic) return;
    setIsTopicDeleting(true);
    setDeleteTopicError("");
    try {
      const res = await fetch(`/api/instructor/topics/${deletingTopic._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDeletingTopic(null);
        showToast("success", data.message || "Đã xóa chuyên đề!");
        await reloadData(selectedSubjectId);
      } else {
        setDeleteTopicError(data.message || "Không thể xóa chuyên đề.");
      }
    } catch {
      setDeleteTopicError("Lỗi kết nối máy chủ khi xóa chuyên đề.");
    } finally {
      setIsTopicDeleting(false);
    }
  }

  // Recursive Topic Tree Node Renderer
  function renderTopicNode(node: TopicTreeNode, depth = 0) {
    const hasChildren = node.children.length > 0;
    const isCollapsed = !!collapsedNodes[node._id] && !topicSearch.trim();
    const canManage = canManageTopic(node);
    const directTotal = node.stats?.total ?? node.questionCount ?? 0;
    const easyCount = node.subtreeStats.easy;
    const mediumCount = node.subtreeStats.medium;
    const hardCount = node.subtreeStats.hard;
    const aiCount = node.subtreeStats.aiCount || 0;

    return (
      <div key={node._id} className="select-none">
        <div
          className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
            depth === 0
              ? "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-blue-300 dark:hover:border-blue-800"
              : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800/70 hover:bg-white dark:hover:bg-slate-800/80 hover:border-blue-300 dark:hover:border-blue-800"
          }`}
        >
          {/* Left: Expand toggle, Icon, Name & Meta */}
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleCollapse(node._id)}
                title={isCollapsed ? "Mở rộng nhánh con" : "Thu gọn nhánh con"}
                className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer shrink-0"
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isCollapsed ? "-rotate-90" : "rotate-0"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            ) : (
              <span className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            )}

            {/* Folder / Node Icon */}
            <div
              className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                depth === 0
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                  : depth === 1
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                  : "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400"
              }`}
            >
              {hasChildren ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 break-words">
                  {node.topic_name}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    node.level === 1
                      ? "bg-blue-100/80 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : node.level === 2
                      ? "bg-indigo-100/80 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                      : "bg-violet-100/80 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                  }`}
                >
                  Cấp {node.level}
                </span>
                {hasChildren && (
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    ({node.children.length} nhánh con)
                  </span>
                )}
              </div>

              {node.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {node.description}
                </p>
              )}

              {/* Question breakdown badges */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  Tổng: {node.subtreeQuestionCount} câu
                  {hasChildren && directTotal !== node.subtreeQuestionCount
                    ? ` (Trực tiếp: ${directTotal})`
                    : ""}
                </span>

                {node.subtreeQuestionCount > 0 && (
                  <>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-medium">
                      Dễ: {easyCount}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-medium">
                      Vừa: {mediumCount}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-medium">
                      Khó: {hardCount}
                    </span>
                  </>
                )}

                {aiCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-semibold">
                    ✨ {aiCount} AI
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => openCreateTopicModal(node._id)}
              title="Thêm chuyên đề con vào nhánh này"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-400 transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Nhánh con</span>
            </button>

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => openEditTopicModal(node)}
                  title="Chỉnh sửa chuyên đề"
                  className="p-1.5 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeletingTopic(node);
                    setDeleteTopicError("");
                  }}
                  title="Xóa chuyên đề"
                  className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Recursive Children */}
        {hasChildren && !isCollapsed && (
          <div className="ml-5 sm:ml-8 mt-2 pl-3.5 border-l-2 border-slate-200 dark:border-slate-800 space-y-2">
            {node.children.map((child) => renderTopicNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-white/80 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng Số Môn Học
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {kpiStats.totalSubjects}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Danh mục môn đào tạo trên hệ thống
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng Chủ Đề Kiến Thức
            </span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {kpiStats.totalTopics}
          </div>
          <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            {kpiStats.rootTopics} chương gốc • {kpiStats.subTopics} nhánh con
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Câu Hỏi Đã Phân Loại
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {kpiStats.totalQuestions}
          </div>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Bảo vệ chống xóa nhầm chuyên đề
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Câu Hỏi Sinh Bởi AI
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {kpiStats.totalAiQuestions}
          </div>
          <p className="mt-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
            Tự động gắn nhãn theo cây chủ đề
          </p>
        </div>
      </div>

      {/* 1. HORIZONTAL SUBJECT SELECTOR / MANAGEMENT BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Danh Mục Môn Học
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold">
                {subjects.length} môn
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn môn học để xem và điều hành toàn bộ cây cấu trúc kiến thức phân cấp
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Subject */}
            <div className="relative w-48 sm:w-60">
              <input
                type="text"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Tìm tên môn học..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition"
              />
              <svg
                className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <button
              type="button"
              onClick={openCreateSubjectModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20 transition cursor-pointer shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Thêm Môn</span>
            </button>
          </div>
        </div>

        {/* Subjects Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
          {filteredSubjects.length === 0 ? (
            <div className="col-span-full text-center py-6 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500">
                Không tìm thấy môn học nào phù hợp với từ khóa &ldquo;{subjectSearch}&rdquo;.
              </p>
            </div>
          ) : (
            filteredSubjects.map((sub) => {
              const isSelected = sub._id === selectedSubjectId;
              const canManage = canManageSubject(sub);
              return (
                <div
                  key={sub._id}
                  onClick={() => setSelectedSubjectId(sub._id)}
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-800"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isSelected
                              ? "bg-blue-600 ring-4 ring-blue-500/20"
                              : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        />
                        <h3
                          className={`text-sm font-bold truncate ${
                            isSelected
                              ? "text-blue-700 dark:text-blue-300"
                              : "text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                          }`}
                        >
                          {sub.subject_name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isSelected && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/50 px-1.5 py-0.5 rounded-md">
                            Đang chọn
                          </span>
                        )}

                        {canManage && (
                          <div
                            className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => openEditSubjectModal(sub)}
                              title="Sửa môn học"
                              className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingSubject(sub);
                                setDeleteSubjectError("");
                              }}
                              title="Xóa môn học"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {sub.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 pl-4.5">
                        {sub.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pl-4.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50 pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {sub.topicCount || 0} chủ đề
                      </span>
                      <span>•</span>
                      <span>{sub.questionCount || 0} câu</span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                      {getCreatorLabel(sub.created_by)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. FULL-WIDTH: HIERARCHICAL TOPIC TREE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        {!selectedSubject ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Chưa chọn môn học nào
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Hãy chọn một môn học ở danh mục phía trên hoặc tạo môn học mới để bắt đầu quản lý cây chủ đề kiến thức.
            </p>
          </div>
        ) : (
          <>
            {/* Subject Header & Tree Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold">
                    Môn học
                  </span>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedSubject.subject_name}
                  </h2>
                  {isRefreshing && (
                    <span className="text-xs text-blue-600 animate-pulse font-medium">
                      Đang đồng bộ...
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedSubject.description ||
                    "Cây phân cấp chương mục và chủ đề kiến thức phục vụ ngân hàng câu hỏi & AI"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  href="/instructor/questions"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-semibold transition"
                >
                  <span>Ngân Hàng Câu Hỏi</span>
                  <span>&rarr;</span>
                </Link>

                <button
                  type="button"
                  onClick={() => openCreateTopicModal(null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Thêm Chương / Chủ Đề Gốc</span>
                </button>
              </div>
            </div>

              {/* Filter & Expand/Collapse Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    placeholder="Lọc nhanh tên chương hoặc chủ đề con trong môn này..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition"
                  />
                  <svg
                    className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition cursor-pointer"
                  >
                    Mở rộng tất cả
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition cursor-pointer"
                  >
                    Thu gọn tất cả
                  </button>
                </div>
              </div>

              {/* Tree View Content */}
              {topicTree.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto mb-2.5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {topicSearch.trim()
                      ? "Không tìm thấy chủ đề khớp từ khóa"
                      : "Môn học này chưa có chủ đề kiến thức nào"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {topicSearch.trim()
                      ? "Hãy thử từ khóa khác hoặc xóa bộ lọc tìm kiếm."
                      : "Hãy khởi tạo Chương / Chủ đề cấp 1 đầu tiên, sau đó bạn có thể phân nhánh thành các bài học hoặc chủ đề con đa cấp."}
                  </p>
                  {!topicSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => openCreateTopicModal(null)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                    >
                      + Tạo Chủ Đề Cấp 1 Đầu Tiên
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {topicTree.map((rootNode) => renderTopicNode(rootNode, 0))}
                </div>
              )}
            </>
          )}
        </div>

      {/* MODAL: CREATE / EDIT SUBJECT */}
      {subjectModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {subjectModalMode === "create"
                  ? "Thêm Môn Học Mới"
                  : "Cập Nhật Thông Tin Môn Học"}
              </h3>
              <button
                type="button"
                onClick={() => setSubjectModalMode(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="mt-4 space-y-4">
              {subjectError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-600 dark:text-rose-300">
                  {subjectError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên môn học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subjectNameInput}
                  onChange={(e) => setSubjectNameInput(e.target.value)}
                  placeholder="Ví dụ: Toán Cao Cấp A1, Lập Trình Web..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô tả môn học
                </label>
                <textarea
                  rows={3}
                  value={subjectDescInput}
                  onChange={(e) => setSubjectDescInput(e.target.value)}
                  placeholder="Mô tả mục tiêu, phạm vi kiến thức của môn học..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubjectModalMode(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubjectSaving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {isSubjectSaving
                    ? "Đang lưu..."
                    : subjectModalMode === "create"
                    ? "Tạo Môn Học"
                    : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE SUBJECT */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Xác Nhận Xóa Môn Học
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa môn học{" "}
              <strong className="text-slate-900 dark:text-white">
                &ldquo;{deletingSubject.subject_name}&rdquo;
              </strong>{" "}
              cùng các chủ đề rỗng bên trong không?
            </p>

            {(deletingSubject.questionCount || 0) > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                ⚠ Môn học này đang chứa{" "}
                <strong>{deletingSubject.questionCount} câu hỏi</strong>. Hệ thống sẽ chặn xóa để bảo vệ ngân hàng câu hỏi.
              </div>
            )}

            {deleteSubjectError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300">
                {deleteSubjectError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSubject(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isSubjectDeleting}
                onClick={handleConfirmDeleteSubject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                {isSubjectDeleting ? "Đang xóa..." : "Xác Nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT TOPIC */}
      {topicModalMode && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {topicModalMode === "create"
                    ? "Thêm Chủ Đề / Chuyên Đề Kiến Thức"
                    : "Chỉnh Sửa Chủ Đề Kiến Thức"}
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                  Môn học: {selectedSubject.subject_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTopicModalMode(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="mt-4 space-y-4">
              {topicError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-600 dark:text-rose-300">
                  {topicError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thuộc nhánh chủ đề cha (Phân cấp cây kiến thức)
                </label>
                <select
                  value={topicParentIdInput}
                  onChange={(e) => setTopicParentIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                >
                  <option value="">
                    📁 Chủ đề Gốc (Cấp 1 — Chương lớn / Học phần)
                  </option>
                  {parentTopicOptions.map((opt) => (
                    <option key={opt._id} value={opt._id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Để trống nếu đây là Chương lớn (Cấp 1), hoặc chọn một chủ đề cha để tạo nhánh con (Cấp 2, 3...).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên chủ đề / chuyên đề <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={topicNameInput}
                  onChange={(e) => setTopicNameInput(e.target.value)}
                  placeholder="Ví dụ: Chương 1: Hàm số và Giới hạn, Bài 1.1: Khảo sát cực trị..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô tả phạm vi kiến thức / Chuẩn đầu ra
                </label>
                <textarea
                  rows={3}
                  value={topicDescInput}
                  onChange={(e) => setTopicDescInput(e.target.value)}
                  placeholder="Ghi chú nội dung trọng tâm để AI nhận diện ngữ cảnh sinh câu hỏi chính xác hơn..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTopicModalMode(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isTopicSaving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {isTopicSaving
                    ? "Đang lưu..."
                    : topicModalMode === "create"
                    ? "Tạo Chủ Đề"
                    : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE TOPIC */}
      {deletingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Xác Nhận Xóa Chủ Đề Kiến Thức
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa chủ đề{" "}
              <strong className="text-slate-900 dark:text-white">
                &ldquo;{deletingTopic.topic_name}&rdquo;
              </strong>
              {deletingTopic.children.length > 0
                ? ` và ${deletingTopic.children.length} nhánh chuyên đề con trực thuộc`
                : ""}{" "}
              không?
            </p>

            {deletingTopic.subtreeQuestionCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                ⚠ Nhánh chủ đề này đang chứa{" "}
                <strong>{deletingTopic.subtreeQuestionCount} câu hỏi</strong>. Hệ thống sẽ chặn xóa để tránh làm mất câu hỏi trong ngân hàng.
              </div>
            )}

            {deleteTopicError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300">
                {deleteTopicError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTopic(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isTopicDeleting}
                onClick={handleConfirmDeleteTopic}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                {isTopicDeleting ? "Đang xóa..." : "Xác Nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

