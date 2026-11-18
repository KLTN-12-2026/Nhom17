"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

export interface SubjectItem {
  _id: string;
  subject_name: string;
  code?: string;
  topicCount?: number;
  questionCount?: number;
}

export interface TopicItem {
  _id: string;
  topic_name: string;
  subject_id: string;
  parent_id?: string | { _id: string } | null;
  level: number;
  questionCount?: number;
  stats?: {
    total: number;
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface OptionItem {
  option_id?: string;
  option_label: string;
  content: string;
  is_correct: boolean;
}

export interface QuestionSnapshot {
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation?: string;
  options: OptionItem[];
}

export interface ExamQuestionEntry {
  question_id: string;
  question_order: number;
  question_score: number;
  topic_name?: string;
  is_custom_edited?: boolean;
  question_snapshot: QuestionSnapshot;
}

interface QuestionBankItem {
  _id: string;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation?: string;
  options: OptionItem[];
  topic_id?: {
    _id: string;
    topic_name: string;
    subject_id?: string;
  };
}

export interface ExamDataToEdit {
  _id?: string;
  title: string;
  subject_id: string | { _id: string; subject_name: string };
  subject_ids?: Array<string | { _id: string; subject_name: string }>;
  duration_minutes: number;
  pass_score: number;
  max_score: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  allow_view_result_immediately: boolean;
  is_published: boolean;
  questions: Array<{
    question_id: string | { _id: string; content?: string };
    question_order: number;
    question_score: number;
    question_snapshot?: QuestionSnapshot;
  }>;
}

interface ExamCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedExam: unknown) => void;
  subjects: SubjectItem[];
  topics: TopicItem[];
  initialExam?: ExamDataToEdit | null;
}

function formatInitialExamQuestions(initialExam?: ExamDataToEdit | null): ExamQuestionEntry[] {
  if (initialExam && initialExam.questions && initialExam.questions.length > 0) {
    return initialExam.questions.map((q, idx) => {
      const qId = typeof q.question_id === "object" ? q.question_id?._id : q.question_id;
      const snapshot = q.question_snapshot || {
        content: typeof q.question_id === "object" ? q.question_id?.content || "" : "",
        difficulty_level: "medium" as const,
        explanation: "",
        options: [],
      };
      return {
        question_id: String(qId),
        question_order: q.question_order || idx + 1,
        question_score: q.question_score || 1,
        question_snapshot: snapshot,
      };
    });
  }
  return [];
}

function getDescendantTopicIds(topicId: string, allTopics: TopicItem[]): Set<string> {
  const result = new Set<string>([topicId]);
  let added = true;
  while (added) {
    added = false;
    for (const t of allTopics) {
      const pid =
        typeof t.parent_id === "object" && t.parent_id
          ? String((t.parent_id as { _id?: string })._id)
          : t.parent_id
            ? String(t.parent_id)
            : null;
      if (pid && result.has(pid) && !result.has(String(t._id))) {
        result.add(String(t._id));
        added = true;
      }
    }
  }
  return result;
}

interface MultiSelectItem {
  value: string;
  label: string;
  badge?: string | number;
}

interface MultiSelectDropdownProps {
  placeholder: string;
  allOptionLabel?: string;
  items: MultiSelectItem[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  minSelected?: number; // e.g. 1 for subjects, 0 for topics
  icon?: string;
}

function MultiSelectDropdown({
  placeholder,
  allOptionLabel,
  items,
  selectedValues,
  onChange,
  disabled = false,
  minSelected = 0,
  icon = "",
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const isAllSelected = minSelected === 0 ? selectedValues.length === 0 : selectedValues.length === items.length;

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, searchQuery]);

  // Nhãn hiển thị trên trigger button
  const displayText = useMemo(() => {
    if (minSelected === 0 && selectedValues.length === 0) {
      return allOptionLabel || `${placeholder} (${items.length})`;
    }
    if (minSelected > 0 && selectedValues.length === items.length && items.length > 0) {
      return `Tất cả môn (${items.length})`;
    }
    if (selectedValues.length === 1) {
      const match = items.find((i) => i.value === selectedValues[0]);
      return match ? match.label : "1 mục đã chọn";
    }
    if (selectedValues.length > 1) {
      const firstMatch = items.find((i) => i.value === selectedValues[0]);
      return `Đã chọn (${selectedValues.length}): ${firstMatch?.label || ""}`;
    }
    return placeholder;
  }, [selectedValues, items, allOptionLabel, placeholder, minSelected]);

  function handleToggleItem(val: string) {
    if (minSelected === 0) {
      if (selectedValues.length === 0) {
        onChange([val]);
        return;
      }
      if (selectedValues.includes(val)) {
        const next = selectedValues.filter((v) => v !== val);
        onChange(next);
      } else {
        const next = [...selectedValues, val];
        if (next.length === items.length) {
          onChange([]);
        } else {
          onChange(next);
        }
      }
    } else {
      if (selectedValues.includes(val)) {
        if (selectedValues.length <= minSelected) return;
        onChange(selectedValues.filter((v) => v !== val));
      } else {
        onChange([...selectedValues, val]);
      }
    }
  }

  function handleSelectOnly(val: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange([val]);
  }

  function handleSelectAll() {
    if (minSelected > 0) {
      onChange(items.map((i) => i.value));
    } else {
      onChange([]);
    }
  }

  function handleClearAll() {
    if (minSelected > 0) {
      onChange(items.length > 0 ? [items[0].value] : []);
    } else {
      onChange([]);
    }
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-xs py-2 px-2.5 rounded-lg border text-left flex items-center justify-between gap-1.5 transition cursor-pointer ${
          disabled
            ? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 opacity-50 cursor-not-allowed text-slate-400"
            : isOpen
            ? "border-slate-900 dark:border-white bg-white dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-900 dark:ring-white"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600"
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate font-medium">{displayText}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 1 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              {selectedValues.length}
            </span>
          )}
          <span className={`text-[10px] text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>
            ▼
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 left-0 w-full min-w-[260px] max-w-md bg-white dark:bg-slate-850 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-1.5 pt-0.5 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {isAllSelected
                ? "Tất cả (" + items.length + ")"
                : `Đã chọn: ${selectedValues.length}/${items.length}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                Chọn hết
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer"
              >
                {minSelected > 0 ? "Mặc định" : "Bỏ chọn"}
              </button>
            </div>
          </div>

          {items.length > 5 && (
            <div className="px-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh..."
                className="w-full text-[11px] px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          )}

          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            {allOptionLabel && minSelected === 0 && !searchQuery && (
              <div
                onClick={() => onChange([])}
                className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition ${
                  selectedValues.length === 0
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedValues.length === 0}
                    readOnly
                    className="rounded text-slate-900 dark:text-white focus:ring-0 cursor-pointer pointer-events-none"
                  />
                  <span>{allOptionLabel}</span>
                </div>
                <span className="text-[10px] text-slate-400">({items.length})</span>
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className="text-center py-3 text-xs text-slate-400">Không tìm thấy mục nào</div>
            ) : (
              filteredItems.map((item) => {
                const isChecked = selectedValues.includes(item.value);
                return (
                  <div
                    key={item.value}
                    onClick={() => handleToggleItem(item.value)}
                    className={`group flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition ${
                      isChecked
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded text-slate-900 dark:text-white focus:ring-0 cursor-pointer pointer-events-none"
                      />
                      <span className="truncate" title={item.label}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {item.badge}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleSelectOnly(item.value, e)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 dark:text-blue-400 hover:underline px-1 transition"
                        title="Chỉ chọn mục này"
                      >
                        Chỉ chọn
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExamCreatorContent({
  onClose,
  onSuccess,
  subjects,
  topics,
  initialExam,
}: Omit<ExamCreatorModalProps, "isOpen">) {
  // ==========================================
  // 1. CẤU HÌNH ĐỀ THI
  // ==========================================
  const [title, setTitle] = useState(initialExam?.title || "");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (initialExam?.subject_id) {
      return typeof initialExam.subject_id === "object"
        ? (initialExam.subject_id as { _id?: string })._id || ""
        : String(initialExam.subject_id);
    }
    return subjects.length > 0 ? subjects[0]._id : "";
  });
  const [durationMinutes, setDurationMinutes] = useState(initialExam?.duration_minutes || 45);
  const [maxScore, setMaxScore] = useState(initialExam?.max_score || 10.0);
  const [passScore, setPassScore] = useState(initialExam?.pass_score || 5.0);
  const [shuffleQuestions, setShuffleQuestions] = useState(
    initialExam?.shuffle_questions !== undefined ? initialExam.shuffle_questions : true
  );
  const [shuffleOptions, setShuffleOptions] = useState(
    initialExam?.shuffle_options !== undefined ? initialExam.shuffle_options : true
  );
  const [allowViewResult, setAllowViewResult] = useState(
    initialExam?.allow_view_result_immediately !== undefined
      ? initialExam.allow_view_result_immediately
      : true
  );
  const [autoDistributeScores, setAutoDistributeScores] = useState(true);

  // Khóa cuộn trang nền khi mở modal
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // ==========================================
  // 2. DANH SÁCH CÂU HỎI TRONG ĐỀ THI
  // ==========================================
  const [examQuestions, setExamQuestions] = useState<ExamQuestionEntry[]>(() =>
    formatInitialExamQuestions(initialExam)
  );

  // ==========================================
  // 3. TAB ĐIỀU HƯỚNG & PHƯƠNG THỨC THÊM
  // ==========================================
  const [activeTab, setActiveTab] = useState<"config" | "add_questions" | "review">("config");
  const [addMode, setAddMode] = useState<"manual" | "random" | "create_new">("manual");

  // ==========================================
  // 4. BỘ LỌC CHỌN THỦ CÔNG (Đa chọn Chuyên đề & Dạng bài)
  // ==========================================
  const [bankQuestions, setBankQuestions] = useState<QuestionBankItem[]>([]);
  const [isLoadingBankQuestions, setIsLoadingBankQuestions] = useState(false);
  const [manualChapterIds, setManualChapterIds] = useState<string[]>([]);
  const [manualSubtopicIds, setManualSubtopicIds] = useState<string[]>([]);
  const [manualDifficulty, setManualDifficulty] = useState("all");
  const [manualSearchQuery, setManualSearchQuery] = useState("");

  // ==========================================
  // 5. BỐC NGẪU NHIÊN MA TRẬN (Đa chọn Chuyên đề & Dạng bài)
  // ==========================================
  const [randomChapterIds, setRandomChapterIds] = useState<string[]>([]);
  const [randomSubtopicIds, setRandomSubtopicIds] = useState<string[]>([]);
  const [randomEasyCount, setRandomEasyCount] = useState(0);
  const [randomMediumCount, setRandomMediumCount] = useState(0);
  const [randomHardCount, setRandomHardCount] = useState(0);
  const [isRandomPicking, setIsRandomPicking] = useState(false);
  const [randomPickMessage, setRandomPickMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // ==========================================
  // 6. SOẠN CÂU HỎI MỚI TRỰC TIẾP
  // ==========================================
  const [newQChapterId, setNewQChapterId] = useState("");
  const [newQSubtopicId, setNewQSubtopicId] = useState("");
  const [newQContent, setNewQContent] = useState("");
  const [newQDifficulty, setNewQDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [newQExplanation, setNewQExplanation] = useState("");
  const [newQOptions, setNewQOptions] = useState([
    { option_label: "A", content: "", is_correct: true },
    { option_label: "B", content: "", is_correct: false },
    { option_label: "C", content: "", is_correct: false },
    { option_label: "D", content: "", is_correct: false },
  ]);
  const [isCreatingNewQuestion, setIsCreatingNewQuestion] = useState(false);

  // ==========================================
  // 7. SỬA CÂU HỎI TRONG ĐỀ
  // ==========================================
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQContent, setEditQContent] = useState("");
  const [editQDifficulty, setEditQDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [editQExplanation, setEditQExplanation] = useState("");
  const [editQOptions, setEditQOptions] = useState<OptionItem[]>([]);

  // ==========================================
  // 8. TRẠNG THÁI FORM & SUBMIT
  // ==========================================
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Môn học hiện tại đang chọn
  const selectedSubjectObj = useMemo(() => {
    return subjects.find((s) => s._id === selectedSubjectId);
  }, [subjects, selectedSubjectId]);

  // Lọc các chuyên đề thuộc môn học đang chọn
  const availableTopics = useMemo(() => {
    if (!selectedSubjectId) return [];
    return topics.filter((t) => String(t.subject_id) === String(selectedSubjectId));
  }, [topics, selectedSubjectId]);

  // Cấp 1: Chuyên đề lớn / Chương (level 1 hoặc không có parent_id)
  const chapters = useMemo(() => {
    return availableTopics.filter((t) => t.level === 1 || !t.parent_id);
  }, [availableTopics]);

  // Cấp 2: Dạng bài ôn thi thuộc các Chuyên đề đang chọn (Chọn thủ công)
  const manualSubtopics = useMemo(() => {
    if (manualChapterIds.length === 0) {
      return availableTopics.filter((t) => t.level === 2 || Boolean(t.parent_id));
    }
    const parentSet = new Set(manualChapterIds);
    return availableTopics.filter((t) => {
      const pid =
        typeof t.parent_id === "object" && t.parent_id
          ? String((t.parent_id as { _id?: string })._id)
          : String(t.parent_id || "");
      return parentSet.has(pid);
    });
  }, [availableTopics, manualChapterIds]);

  // Topic ID hiệu lực đang chọn ở Chọn thủ công (hỗ trợ chọn nhiều chuyên đề & dạng bài)
  const activeManualMatchingTopicIds = useMemo(() => {
    if (manualSubtopicIds.length > 0) {
      return new Set(manualSubtopicIds);
    }
    if (manualChapterIds.length > 0) {
      const matchingIds = new Set<string>();
      for (const chId of manualChapterIds) {
        matchingIds.add(chId);
        const descendants = getDescendantTopicIds(chId, availableTopics);
        descendants.forEach((id) => matchingIds.add(id));
      }
      return matchingIds;
    }
    return null;
  }, [manualChapterIds, manualSubtopicIds, availableTopics]);

  // Cấp 2: Dạng bài thuộc các Chuyên đề đang chọn (Bốc ngẫu nhiên)
  const randomSubtopics = useMemo(() => {
    if (randomChapterIds.length === 0) {
      return availableTopics.filter((t) => t.level === 2 || Boolean(t.parent_id));
    }
    const parentSet = new Set(randomChapterIds);
    return availableTopics.filter((t) => {
      const pid =
        typeof t.parent_id === "object" && t.parent_id
          ? String((t.parent_id as { _id?: string })._id)
          : String(t.parent_id || "");
      return parentSet.has(pid);
    });
  }, [availableTopics, randomChapterIds]);

  const activeRandomMatchingTopicIds = useMemo(() => {
    if (randomSubtopicIds.length > 0) {
      return new Set(randomSubtopicIds);
    }
    if (randomChapterIds.length > 0) {
      const matchingIds = new Set<string>();
      for (const chId of randomChapterIds) {
        matchingIds.add(chId);
        const descendants = getDescendantTopicIds(chId, availableTopics);
        descendants.forEach((id) => matchingIds.add(id));
      }
      return matchingIds;
    }
    return null;
  }, [randomChapterIds, randomSubtopicIds, availableTopics]);

  const randomActiveScopeName = useMemo(() => {
    if (randomSubtopicIds.length > 0) {
      if (randomSubtopicIds.length === 1) {
        const t = availableTopics.find((x) => x._id === randomSubtopicIds[0]);
        return t ? `Dạng: ${t.topic_name}` : "1 dạng bài đã chọn";
      }
      return `${randomSubtopicIds.length} dạng bài đã chọn`;
    }
    if (randomChapterIds.length > 0) {
      if (randomChapterIds.length === 1) {
        const c = availableTopics.find((x) => x._id === randomChapterIds[0]);
        return c ? `Chuyên đề: ${c.topic_name}` : "1 chuyên đề đã chọn";
      }
      return `${randomChapterIds.length} chuyên đề đã chọn`;
    }
    return "Toàn bộ môn học";
  }, [randomChapterIds, randomSubtopicIds, availableTopics]);

  // Cấp 2: Dạng bài thuộc Chuyên đề đang chọn (Soạn câu mới)
  const newQSubtopics = useMemo(() => {
    if (!newQChapterId) return [];
    return availableTopics.filter((t) => {
      const pid =
        typeof t.parent_id === "object" && t.parent_id
          ? String((t.parent_id as { _id?: string })._id)
          : String(t.parent_id || "");
      return pid === newQChapterId;
    });
  }, [availableTopics, newQChapterId]);

  // Tải danh sách câu hỏi ngân hàng khi môn học thay đổi
  useEffect(() => {
    async function fetchBankQuestions() {
      if (!selectedSubjectId) {
        setBankQuestions([]);
        return;
      }
      setIsLoadingBankQuestions(true);
      try {
        const params = new URLSearchParams();
        params.set("subject_id", selectedSubjectId);
        const res = await fetch(`/api/instructor/questions?${params.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.questions)) {
          setBankQuestions(data.questions);
        } else {
          setBankQuestions([]);
        }
      } catch (err) {
        console.error("Lỗi khi tải câu hỏi ngân hàng:", err);
      } finally {
        setIsLoadingBankQuestions(false);
      }
    }

    fetchBankQuestions();
  }, [selectedSubjectId]);

  // Danh sách ID câu hỏi đã có trong đề thi
  const selectedQuestionIds = useMemo(() => {
    return new Set(examQuestions.map((q) => q.question_id));
  }, [examQuestions]);

  // Danh sách câu hỏi hiển thị khi lọc thủ công
  const filteredBankQuestions = useMemo(() => {
    return bankQuestions.filter((q) => {
      if (activeManualMatchingTopicIds) {
        const qTopicId = typeof q.topic_id === "object" ? String(q.topic_id?._id) : String(q.topic_id);
        if (!activeManualMatchingTopicIds.has(qTopicId)) return false;
      }
      if (manualDifficulty !== "all" && q.difficulty_level !== manualDifficulty) {
        return false;
      }
      if (manualSearchQuery.trim()) {
        const term = manualSearchQuery.toLowerCase();
        const inContent = q.content.toLowerCase().includes(term);
        const inOptions = q.options.some((o) => o.content.toLowerCase().includes(term));
        if (!inContent && !inOptions) return false;
      }
      return true;
    });
  }, [bankQuestions, activeManualMatchingTopicIds, manualDifficulty, manualSearchQuery]);

  // Thống kê số lượng câu hỏi khả dụng để bốc ngẫu nhiên
  const randomTopicStats = useMemo(() => {
    const relevant = bankQuestions.filter((q) => {
      if (selectedQuestionIds.has(q._id)) return false;
      if (activeRandomMatchingTopicIds) {
        const qTopicId = typeof q.topic_id === "object" ? String(q.topic_id?._id) : String(q.topic_id);
        if (!activeRandomMatchingTopicIds.has(qTopicId)) return false;
      }
      return true;
    });

    return {
      easy: relevant.filter((q) => q.difficulty_level === "easy").length,
      medium: relevant.filter((q) => q.difficulty_level === "medium").length,
      hard: relevant.filter((q) => q.difficulty_level === "hard").length,
      total: relevant.length,
    };
  }, [bankQuestions, selectedQuestionIds, activeRandomMatchingTopicIds]);

  // ============================================================
  // HÀM TỰ ĐỘNG CHIA ĐIỀU ĐIỂM (EQUAL SCORE DISTRIBUTION)
  // ============================================================
  const distributeScores = useCallback(
    (questions: ExamQuestionEntry[], targetMax: number = maxScore): ExamQuestionEntry[] => {
      const count = questions.length;
      if (count === 0) return [];
      const baseScore = parseFloat((targetMax / count).toFixed(2));
      return questions.map((q, idx) => ({
        ...q,
        question_order: idx + 1,
        question_score: baseScore,
      }));
    },
    [maxScore]
  );

  // Thêm 1 câu hỏi thủ công từ ngân hàng
  function handleAddQuestionToExam(q: QuestionBankItem) {
    if (selectedQuestionIds.has(q._id)) {
      // Nếu đã có thì xóa bỏ
      setExamQuestions((prev) => {
        const filtered = prev.filter((item) => item.question_id !== q._id);
        return autoDistributeScores ? distributeScores(filtered) : filtered.map((item, idx) => ({ ...item, question_order: idx + 1 }));
      });
      return;
    }

    const newEntry: ExamQuestionEntry = {
      question_id: q._id,
      question_order: examQuestions.length + 1,
      question_score: 1,
      topic_name: typeof q.topic_id === "object" ? q.topic_id?.topic_name : undefined,
      question_snapshot: {
        content: q.content,
        difficulty_level: q.difficulty_level,
        explanation: q.explanation || "",
        options: q.options.map((opt) => ({
          option_id: opt.option_id,
          option_label: opt.option_label,
          content: opt.content,
          is_correct: opt.is_correct,
        })),
      },
    };

    setExamQuestions((prev) => {
      const nextList = [...prev, newEntry];
      return autoDistributeScores ? distributeScores(nextList) : nextList;
    });
  }

  // Thêm toàn bộ câu hỏi đang lọc
  function handleAddAllFiltered() {
    const toAdd = filteredBankQuestions.filter((q) => !selectedQuestionIds.has(q._id));
    if (toAdd.length === 0) return;

    const newEntries: ExamQuestionEntry[] = toAdd.map((q, idx) => ({
      question_id: q._id,
      question_order: examQuestions.length + idx + 1,
      question_score: 1,
      topic_name: typeof q.topic_id === "object" ? q.topic_id?.topic_name : undefined,
      question_snapshot: {
        content: q.content,
        difficulty_level: q.difficulty_level,
        explanation: q.explanation || "",
        options: q.options.map((opt) => ({
          option_id: opt.option_id,
          option_label: opt.option_label,
          content: opt.content,
          is_correct: opt.is_correct,
        })),
      },
    }));

    setExamQuestions((prev) => {
      const nextList = [...prev, ...newEntries];
      return autoDistributeScores ? distributeScores(nextList) : nextList;
    });
  }

  // Bốc ngẫu nhiên câu hỏi theo ma trận
  async function handleRandomPick() {
    setRandomPickMessage(null);
    const totalToPick = randomEasyCount + randomMediumCount + randomHardCount;
    if (totalToPick <= 0) {
      setRandomPickMessage({ text: "Vui lòng nhập số lượng câu hỏi cần bốc lớn hơn 0", type: "error" });
      return;
    }

    setIsRandomPicking(true);
    try {
      const bodyPayload = {
        subject_id: selectedSubjectId,
        topic_ids: activeRandomMatchingTopicIds ? Array.from(activeRandomMatchingTopicIds) : undefined,
        easy_count: randomEasyCount,
        medium_count: randomMediumCount,
        hard_count: randomHardCount,
        exclude_ids: Array.from(selectedQuestionIds),
      };

      const res = await fetch("/api/instructor/exams/random-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!data.success) {
        setRandomPickMessage({ text: data.message || "Không thể bốc câu hỏi", type: "error" });
        return;
      }

      const pickedQuestions: QuestionBankItem[] = data.questions || [];
      if (pickedQuestions.length === 0) {
        setRandomPickMessage({ text: "Không tìm thấy câu hỏi khả dụng thỏa mãn điều kiện bốc", type: "error" });
        return;
      }

      const newEntries: ExamQuestionEntry[] = pickedQuestions.map((q, idx) => ({
        question_id: q._id,
        question_order: examQuestions.length + idx + 1,
        question_score: 1,
        topic_name: typeof q.topic_id === "object" ? q.topic_id?.topic_name : undefined,
        question_snapshot: {
          content: q.content,
          difficulty_level: q.difficulty_level,
          explanation: q.explanation || "",
          options: q.options.map((opt) => ({
            option_id: opt.option_id,
            option_label: opt.option_label,
            content: opt.content,
            is_correct: opt.is_correct,
          })),
        },
      }));

      setExamQuestions((prev) => {
        const nextList = [...prev, ...newEntries];
        return autoDistributeScores ? distributeScores(nextList) : nextList;
      });

      setRandomPickMessage({
        text: `Đã bốc thành công ${pickedQuestions.length} câu hỏi vào đề thi!`,
        type: "success",
      });

      setRandomEasyCount(0);
      setRandomMediumCount(0);
      setRandomHardCount(0);
    } catch {
      setRandomPickMessage({ text: "Lỗi kết nối khi bốc ngẫu nhiên câu hỏi", type: "error" });
    } finally {
      setIsRandomPicking(false);
    }
  }

  // Áp dụng Preset bốc ma trận nhanh
  function applyPreset(presetType: "15p" | "45p" | "thpt") {
    if (presetType === "15p") {
      setRandomEasyCount(Math.min(3, randomTopicStats.easy));
      setRandomMediumCount(Math.min(2, randomTopicStats.medium));
      setRandomHardCount(0);
    } else if (presetType === "45p") {
      setRandomEasyCount(Math.min(4, randomTopicStats.easy));
      setRandomMediumCount(Math.min(4, randomTopicStats.medium));
      setRandomHardCount(Math.min(2, randomTopicStats.hard));
    } else if (presetType === "thpt") {
      setRandomEasyCount(Math.min(8, randomTopicStats.easy));
      setRandomMediumCount(Math.min(8, randomTopicStats.medium));
      setRandomHardCount(Math.min(4, randomTopicStats.hard));
    }
  }

  // Soạn câu hỏi mới trực tiếp vào đề
  async function handleCreateDirectQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newQContent.trim()) {
      alert("Vui lòng nhập nội dung câu hỏi");
      return;
    }

    const targetTopicId = newQSubtopicId || newQChapterId;
    if (!targetTopicId) {
      alert("Vui lòng chọn chuyên đề / dạng bài cho câu hỏi");
      return;
    }

    setIsCreatingNewQuestion(true);
    try {
      const res = await fetch("/api/instructor/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: targetTopicId,
          content: newQContent.trim(),
          difficulty_level: newQDifficulty,
          explanation: newQExplanation.trim(),
          options: newQOptions,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Không thể tạo câu hỏi mới");
        return;
      }

      const createdQ = data.question;
      const topicObj = availableTopics.find((t) => t._id === targetTopicId);

      const newEntry: ExamQuestionEntry = {
        question_id: createdQ._id,
        question_order: examQuestions.length + 1,
        question_score: 1,
        topic_name: topicObj?.topic_name,
        question_snapshot: {
          content: createdQ.content,
          difficulty_level: createdQ.difficulty_level,
          explanation: createdQ.explanation || "",
          options: createdQ.options,
        },
      };

      setExamQuestions((prev) => {
        const nextList = [...prev, newEntry];
        return autoDistributeScores ? distributeScores(nextList) : nextList;
      });

      setBankQuestions((prev) => [createdQ, ...prev]);

      // Reset form soạn mới
      setNewQContent("");
      setNewQExplanation("");
      setNewQOptions([
        { option_label: "A", content: "", is_correct: true },
        { option_label: "B", content: "", is_correct: false },
        { option_label: "C", content: "", is_correct: false },
        { option_label: "D", content: "", is_correct: false },
      ]);
      alert("Đã thêm câu hỏi mới vào đề thi và lưu vào ngân hàng thành công!");
    } catch {
      alert("Lỗi kết nối khi tạo câu hỏi mới");
    } finally {
      setIsCreatingNewQuestion(false);
    }
  }

  // Mở popup sửa câu hỏi trong đề
  function handleOpenEditQuestion(index: number) {
    const q = examQuestions[index];
    if (!q) return;
    setEditingIndex(index);
    setEditQContent(q.question_snapshot.content);
    setEditQDifficulty(q.question_snapshot.difficulty_level);
    setEditQExplanation(q.question_snapshot.explanation || "");
    setEditQOptions(q.question_snapshot.options.map((opt) => ({ ...opt })));
  }

  // Lưu sửa câu hỏi trong đề
  function handleSaveEditedQuestion() {
    if (editingIndex === null) return;
    if (!editQContent.trim()) {
      alert("Nội dung câu hỏi không được để trống");
      return;
    }

    setExamQuestions((prev) => {
      const updated = [...prev];
      updated[editingIndex] = {
        ...updated[editingIndex],
        is_custom_edited: true,
        question_snapshot: {
          ...updated[editingIndex].question_snapshot,
          content: editQContent.trim(),
          difficulty_level: editQDifficulty,
          explanation: editQExplanation.trim(),
          options: editQOptions,
        },
      };
      return updated;
    });

    setEditingIndex(null);
  }

  function handleUpdateSingleScore(index: number, score: number) {
    setAutoDistributeScores(false);
    setExamQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], question_score: Math.max(0, score) };
      return updated;
    });
  }

  function handleRemoveQuestionFromExam(index: number) {
    setExamQuestions((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return autoDistributeScores ? distributeScores(updated) : updated.map((q, idx) => ({ ...q, question_order: idx + 1 }));
    });
  }

  function handleMoveQuestion(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === examQuestions.length - 1) return;

    setExamQuestions((prev) => {
      const updated = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated.map((q, idx) => ({ ...q, question_order: idx + 1 }));
    });
  }

  // Tự động sắp xếp câu hỏi theo tiến trình sư phạm: Dễ -> Vừa -> Khó
  function handleSortByDifficulty() {
    const orderMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
    setExamQuestions((prev) => {
      const sorted = [...prev].sort(
        (a, b) => (orderMap[a.question_snapshot.difficulty_level] || 2) - (orderMap[b.question_snapshot.difficulty_level] || 2)
      );
      return sorted.map((q, idx) => ({ ...q, question_order: idx + 1 }));
    });
  }

  // Thống kê cơ cấu đề thi hiện tại
  const currentExamStats = useMemo(() => {
    let easy = 0;
    let medium = 0;
    let hard = 0;
    let totalScore = 0;

    examQuestions.forEach((q) => {
      totalScore += q.question_score || 0;
      const diff = q.question_snapshot.difficulty_level;
      if (diff === "easy") easy++;
      else if (diff === "hard") hard++;
      else medium++;
    });

    return {
      total: examQuestions.length,
      easy,
      medium,
      hard,
      totalScore: parseFloat(totalScore.toFixed(2)),
    };
  }, [examQuestions]);

  // Lưu đề thi (Nháp hoặc Xuất bản)
  async function handleSaveExam(isPublish: boolean) {
    setFormError("");

    if (!title.trim()) {
      setFormError("Vui lòng nhập tên bài thi / đề thi");
      setActiveTab("config");
      return;
    }

    if (!selectedSubjectId) {
      setFormError("Vui lòng chọn ngân hàng môn học cho đề thi");
      setActiveTab("config");
      return;
    }

    if (examQuestions.length === 0) {
      setFormError("Đề thi phải có ít nhất 1 câu hỏi");
      setActiveTab("add_questions");
      return;
    }

    if (passScore > maxScore) {
      setFormError(`Điểm đạt chuẩn (${passScore}) không được lớn hơn thang điểm tối đa (${maxScore})`);
      setActiveTab("config");
      return;
    }

    // Đảm bảo tổng điểm khớp với maxScore nếu bật autoDistribute
    let finalQuestions = examQuestions;
    if (autoDistributeScores) {
      finalQuestions = distributeScores(examQuestions, maxScore);
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        subject_id: selectedSubjectId,
        duration_minutes: durationMinutes,
        pass_score: passScore,
        max_score: maxScore,
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
        allow_view_result_immediately: allowViewResult,
        is_published: isPublish,
        questions: finalQuestions.map((q, idx) => ({
          question_id: q.question_id,
          question_order: idx + 1,
          question_score: q.question_score || 1,
          question_snapshot: q.question_snapshot,
        })),
      };

      const url = initialExam?._id
        ? `/api/instructor/exams/${initialExam._id}`
        : "/api/instructor/exams";
      const method = initialExam?._id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.exam);
        onClose();
      } else {
        setFormError(data.message || "Lỗi khi lưu đề thi");
      }
    } catch {
      setFormError("Lỗi kết nối máy chủ khi lưu đề thi");
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[92dvh] rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">

        {/* ========================================================================= */}
        {/* HEADER MODAL */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-7 h-7 px-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-[11px] tracking-tight shrink-0 shadow-2xs">
              PQP
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-tight truncate">
                {initialExam ? "Chỉnh Sửa Đề Thi" : "Tạo Đề Thi Mới"}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Thiết lập ngân hàng môn, thời gian, câu hỏi thủ công, bốc ngẫu nhiên ma trận và chia điểm
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer shrink-0 ml-2"
          >
            ✕
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB NAVIGATION BAR */}
        {/* ========================================================================= */}
        <div className="px-3 sm:px-6 pt-2 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              type="button"
              onClick={() => setActiveTab("config")}
              className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${activeTab === "config"
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>1. Cấu Hình Đề Thi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("add_questions")}
              className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${activeTab === "add_questions"
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>2. Thêm Câu Hỏi Vào Đề</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                Kho {bankQuestions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("review")}
              className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${activeTab === "review"
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>3. Câu Hỏi Đã Chọn &amp; Sắp Xếp</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${examQuestions.length > 0
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}>
                {examQuestions.length} câu
              </span>
            </button>
          </div>
        </div>

        {/* THÔNG BÁO LỖI NẾU CÓ */}
        {formError && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1 break-words">{formError}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BODY TỪNG TAB */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-5 sm:space-y-6 overscroll-contain">

          {/* TAB 1: CẤU HÌNH ĐỀ THI */}
          {activeTab === "config" && (
            <div className="space-y-5 max-w-3xl mx-auto w-full">
              {/* Tên đề thi & Ngân hàng môn học */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
                <div className="md:col-span-7 lg:col-span-8">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Tên Bài Thi / Tiêu Đề Đề Thi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Đề khảo sát chất lượng THPT môn Toán - Đề số 01..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 font-medium"
                  />
                </div>

                <div className="md:col-span-5 lg:col-span-4">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Ngân Hàng Môn Học <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      const newSubId = e.target.value;
                      if (examQuestions.length > 0) {
                        const confirmChange = window.confirm(
                          "Đổi ngân hàng môn học sẽ cần rà soát lại các câu hỏi đã chọn. Bạn có chắc muốn đổi không?"
                        );
                        if (!confirmChange) return;
                      }
                      setSelectedSubjectId(newSubId);
                      setManualChapterIds([]);
                      setManualSubtopicIds([]);
                      setRandomChapterIds([]);
                      setRandomSubtopicIds([]);
                      setNewQChapterId("");
                      setNewQSubtopicId("");
                    }}
                    className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-slate-400 cursor-pointer"
                  >
                    {subjects.map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        {sub.subject_name} {sub.code ? `(${sub.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Đề thi được tạo theo ngân hàng câu hỏi của môn đã chọn.
                  </span>
                </div>
              </div>

              {/* Thời gian làm bài & Thang điểm */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Thời Gian Làm Bài (Phút) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[15, 45, 50, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMinutes(mins)}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded border transition cursor-pointer ${durationMinutes === mins
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-semibold"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                      >
                        {mins}p
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Thang Điểm Tối Đa
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    min={1}
                    value={maxScore}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 10;
                      setMaxScore(val);
                      if (autoDistributeScores && examQuestions.length > 0) {
                        setExamQuestions((prev) => distributeScores(prev, val));
                      }
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Mặc định: thang 10 điểm</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Điểm Đạt Chuẩn (Pass)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    min={0}
                    max={maxScore}
                    value={passScore}
                    onChange={(e) => setPassScore(parseFloat(e.target.value) || 5)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-slate-400"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Mặc định: 5.0 điểm (Đạt)</span>
                </div>
              </div>

              {/* Tùy chọn phân bổ điểm thông minh */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850/50 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                    Tự Động Chia Đều Điểm Theo Thang {maxScore} điểm
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    {examQuestions.length > 0
                      ? `Hiện có ${examQuestions.length} câu • Dự kiến: ${(maxScore / examQuestions.length).toFixed(2)} đ/câu`
                      : "Khi thêm câu hỏi, hệ thống sẽ tự động chia đều điểm số để tổng đúng bằng thang điểm tối đa."}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDistributeScores}
                    onChange={(e) => {
                      const isAuto = e.target.checked;
                      setAutoDistributeScores(isAuto);
                      if (isAuto && examQuestions.length > 0) {
                        setExamQuestions((prev) => distributeScores(prev, maxScore));
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-slate-900"></div>
                </label>
              </div>

              {/* Các thiết lập xáo đề, đảo đáp án, xem kết quả */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Cấu Hình Đề Thi Thông Minh &amp; Chống Gian Lận
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Switch 1: Xáo trộn câu hỏi */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-slate-900 rounded shrink-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                        Xáo Thứ Tự Câu Hỏi
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-1">
                        Mỗi thí sinh nhận đề với thứ tự câu hỏi ngẫu nhiên khác nhau
                      </span>
                    </div>
                  </label>

                  {/* Switch 2: Đảo đáp án */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-slate-900 rounded shrink-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                        Xáo Thứ Tự Đáp Án
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-1">
                        Đảo vị trí các phương án A, B, C, D chống nhìn bài nhau
                      </span>
                    </div>
                  </label>

                  {/* Switch 3: Xem đáp án sau nộp */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={allowViewResult}
                      onChange={(e) => setAllowViewResult(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-slate-900 rounded shrink-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                        Xem Đáp Án Sau Nộp
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-1">
                        Cho phép học sinh xem lời giải chi tiết ngay sau khi nộp bài
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Nút chuyển tiếp */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab("add_questions")}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <span>Tiếp tục: Thêm câu hỏi vào đề</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: THÊM CÂU HỎI VÀO ĐỀ */}
          {activeTab === "add_questions" && (
            <div className="space-y-4">
              {/* Phân vùng chọn cách thêm câu hỏi & Môn học bám sát */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-850/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phương thức:</span>
                  <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg gap-1">
                    <button
                      type="button"
                      onClick={() => setAddMode("manual")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${addMode === "manual"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                    >
                      Chọn Thủ Công ({filteredBankQuestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode("random")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${addMode === "random"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                    >
                      Bốc Ngẫu Nhiên
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode("create_new")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${addMode === "create_new"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                    >
                      Soạn Câu Mới
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                  <span>Môn:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedSubjectObj?.subject_name || "Môn học"}
                  </span>
                  <span>•</span>
                  <span>Đã chọn: <strong className="text-slate-900 dark:text-white">{examQuestions.length}</strong> câu</span>
                </div>
              </div>

              {/* PHƯƠNG THỨC 1: CHỌN THỦ CÔNG TỪ NGÂN HÀNG (ĐA CHỌN CHUYÊN ĐỀ & DẠNG BÀI) */}
              {addMode === "manual" && (
                <div className="space-y-3.5">
                  {/* Thanh lọc 2 cấp: Chuyên đề lớn -> Dạng bài */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                      {/* 1. Chọn Chuyên đề lớn */}
                      <div className="lg:col-span-4">
                        <MultiSelectDropdown
                          placeholder="Tất cả chuyên đề"
                          allOptionLabel={`📖 Tất cả chuyên đề (${chapters.length})`}
                          items={chapters.map((c) => ({
                            value: c._id,
                            label: c.topic_name,
                          }))}
                          selectedValues={manualChapterIds}
                          onChange={(newIds) => {
                            setManualChapterIds(newIds);
                            if (newIds.length > 0) {
                              const parentSet = new Set(newIds);
                              setManualSubtopicIds((prev) =>
                                prev.filter((subId) => {
                                  const sub = availableTopics.find((t) => t._id === subId);
                                  const pid = sub?.parent_id
                                    ? typeof sub.parent_id === "object"
                                      ? String((sub.parent_id as { _id?: string })._id)
                                      : String(sub.parent_id)
                                    : "";
                                  return parentSet.has(pid);
                                })
                              );
                            }
                          }}
                          icon="📖"
                        />
                      </div>

                      {/* 2. Chọn Dạng bài ôn thi con */}
                      <div className="lg:col-span-4">
                        <MultiSelectDropdown
                          placeholder={manualSubtopics.length > 0 ? "Tất cả dạng bài" : "(Không có dạng bài)"}
                          allOptionLabel={manualSubtopics.length > 0 ? `🎯 Tất cả dạng bài (${manualSubtopics.length})` : undefined}
                          items={manualSubtopics.map((s) => ({
                            value: s._id,
                            label: s.topic_name,
                          }))}
                          selectedValues={manualSubtopicIds}
                          onChange={setManualSubtopicIds}
                          disabled={manualSubtopics.length === 0}
                          icon="🎯"
                        />
                      </div>

                      {/* 3. Lọc Độ khó */}
                      <div className="lg:col-span-4">
                        <select
                          value={manualDifficulty}
                          onChange={(e) => setManualDifficulty(e.target.value)}
                          className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer"
                        >
                          <option value="all">Mọi mức độ nhận thức</option>
                          <option value="easy">🟢 Mức Dễ (Nhận biết)</option>
                          <option value="medium">🟡 Mức Vừa (Thông hiểu)</option>
                          <option value="hard">🔴 Mức Khó (Vận dụng cao)</option>
                        </select>
                      </div>
                    </div>

                    {/* Hàng tìm kiếm & Nút Chọn hết */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={manualSearchQuery}
                          onChange={(e) => setManualSearchQuery(e.target.value)}
                          placeholder="Tìm nhanh nội dung câu hỏi hoặc đáp án..."
                          className="w-full text-xs py-2 pl-3 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none font-medium"
                        />
                        {manualSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setManualSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddAllFiltered}
                        title="Thêm tất cả các câu đang hiển thị vào đề thi"
                        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs shrink-0 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <span>+</span>
                        <span>Chọn hết ({filteredBankQuestions.length} câu)</span>
                      </button>
                    </div>
                  </div>

                  {/* Danh sách câu hỏi */}
                  {isLoadingBankQuestions ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      Đang tải câu hỏi từ ngân hàng môn học...
                    </div>
                  ) : filteredBankQuestions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      Không tìm thấy câu hỏi phù hợp trong chuyên đề này.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredBankQuestions.map((q, idx) => {
                        const isAdded = selectedQuestionIds.has(q._id);
                        return (
                          <div
                            key={q._id}
                            className={`p-3.5 rounded-xl border transition-all ${isAdded
                                ? "bg-slate-50/80 dark:bg-slate-850/80 border-slate-900/30 dark:border-white/30"
                                : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                              }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 mb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                                  {typeof q.topic_id === "object" ? q.topic_id?.topic_name : "Chuyên đề"}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.difficulty_level === "easy"
                                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                      : q.difficulty_level === "hard"
                                        ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                                        : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                    }`}
                                >
                                  {q.difficulty_level === "easy" ? "Dễ" : q.difficulty_level === "hard" ? "Khó" : "Vừa"}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddQuestionToExam(q)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${isAdded
                                    ? "bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-600"
                                    : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-2xs"
                                  }`}
                              >
                                {isAdded ? "✓ Đã đưa vào đề (Bỏ)" : "+ Đưa vào đề"}
                              </button>
                            </div>

                            {/* Nội dung câu hỏi */}
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mb-2 leading-relaxed">
                              {q.content}
                            </p>

                            {/* 4 đáp án thu gọn */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              {q.options.map((opt) => (
                                <div
                                  key={opt.option_label}
                                  className={`px-2.5 py-1 rounded-md border text-[11px] truncate flex items-center gap-1.5 ${opt.is_correct
                                      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-medium"
                                      : "border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40"
                                    }`}
                                >
                                  <span className="font-bold">{opt.option_label}.</span>
                                  <span className="truncate">{opt.content}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* PHƯƠNG THỨC 2: BỐC NGẪU NHIÊN MA TRẬN */}
              {addMode === "random" && (
                <div className="bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-xl space-y-4 max-w-2xl mx-auto w-full">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>🎲</span>
                      <span>Bốc Ngẫu Nhiên Câu Hỏi Theo Ma Trận Đề Thi</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Hệ thống tự động bốc ngẫu nhiên câu hỏi không trùng lặp từ ngân hàng môn học và phân bổ điểm đều theo thang {maxScore} điểm.
                    </p>
                  </div>

                  {randomPickMessage && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium ${randomPickMessage.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                        }`}
                    >
                      {randomPickMessage.text}
                    </div>
                  )}

                  {/* Phạm vi chuyên đề 2 tầng */}
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-3">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Phạm Vi Chuyên Đề Nguồn Để Bốc:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Chọn Chuyên đề lớn */}
                      <div>
                        <span className="text-[11px] text-slate-500 mb-1 block">
                          1. Chuyên đề lớn {randomChapterIds.length > 0 ? `(${randomChapterIds.length} đã chọn)` : ""}
                        </span>
                        <MultiSelectDropdown
                          placeholder="Toàn bộ chuyên đề"
                          allOptionLabel={`Toàn bộ chuyên đề (${chapters.length})`}
                          items={chapters.map((c) => ({
                            value: c._id,
                            label: c.topic_name,
                          }))}
                          selectedValues={randomChapterIds}
                          onChange={(newIds) => {
                            setRandomChapterIds(newIds);
                            if (newIds.length > 0) {
                              const parentSet = new Set(newIds);
                              setRandomSubtopicIds((prev) =>
                                prev.filter((subId) => {
                                  const sub = availableTopics.find((t) => t._id === subId);
                                  const pid = sub?.parent_id
                                    ? typeof sub.parent_id === "object"
                                      ? String((sub.parent_id as { _id?: string })._id)
                                      : String(sub.parent_id)
                                    : "";
                                  return parentSet.has(pid);
                                })
                              );
                            }
                          }}
                          icon="📖"
                        />
                      </div>

                      {/* Chọn Dạng bài con */}
                      <div>
                        <span className="text-[11px] text-slate-500 mb-1 block">
                          2. Dạng bài ôn thi {randomSubtopicIds.length > 0 ? `(${randomSubtopicIds.length} đã chọn)` : ""}
                        </span>
                        <MultiSelectDropdown
                          placeholder={randomSubtopics.length > 0 ? "Tất cả dạng bài" : "(Không có dạng bài)"}
                          allOptionLabel={randomSubtopics.length > 0 ? `Tất cả dạng bài (${randomSubtopics.length})` : undefined}
                          items={randomSubtopics.map((s) => ({
                            value: s._id,
                            label: s.topic_name,
                          }))}
                          selectedValues={randomSubtopicIds}
                          onChange={setRandomSubtopicIds}
                          disabled={randomSubtopics.length === 0}
                          icon="🎯"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-1">
                      <span>Phạm vi: <strong className="text-slate-800 dark:text-slate-200">{randomActiveScopeName}</strong></span>
                      <span>Khả dụng: <strong className="text-slate-800 dark:text-slate-200">{randomTopicStats.total} câu</strong> (Dễ: {randomTopicStats.easy}, Vừa: {randomTopicStats.medium}, Khó: {randomTopicStats.hard})</span>
                    </div>
                  </div>

                  {/* Nút chọn nhanh cấu trúc đề thi */}
                  <div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Chọn Nhanh Khung Đề Thi Mẫu:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyPreset("15p")}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        ⚡ Đề 15 phút (5 câu)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset("45p")}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        ⏱️ Đề 45 phút (10 câu)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset("thpt")}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        🎓 Đề thi thử (20 câu)
                      </button>
                    </div>
                  </div>

                  {/* 3 ô nhập số lượng Dễ / Vừa / Khó */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">🟢 Mức Dễ</span>
                        <span className="text-[10px] text-slate-400">Có: {randomTopicStats.easy}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={randomTopicStats.easy}
                        value={randomEasyCount}
                        onChange={(e) => setRandomEasyCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full text-sm font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center bg-transparent"
                      />
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">🟡 Mức Vừa</span>
                        <span className="text-[10px] text-slate-400">Có: {randomTopicStats.medium}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={randomTopicStats.medium}
                        value={randomMediumCount}
                        onChange={(e) => setRandomMediumCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full text-sm font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center bg-transparent"
                      />
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">🔴 Mức Khó</span>
                        <span className="text-[10px] text-slate-400">Có: {randomTopicStats.hard}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={randomTopicStats.hard}
                        value={randomHardCount}
                        onChange={(e) => setRandomHardCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full text-sm font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isRandomPicking}
                      onClick={handleRandomPick}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs shadow-2xs transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isRandomPicking ? "Đang bốc câu hỏi..." : "🎲 Bốc Ngẫu Nhiên & Thêm Vào Đề"}
                    </button>
                  </div>
                </div>
              )}

              {/* PHƯƠNG THỨC 3: SOẠN CÂU MỚI TRỰC TIẾP */}
              {addMode === "create_new" && (
                <form
                  onSubmit={handleCreateDirectQuestion}
                  className="bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-xl space-y-3.5 max-w-2xl mx-auto w-full"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>✍️</span>
                      <span>Soạn Câu Hỏi Mới Trực Tiếp Vào Đề Thi</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Câu hỏi sẽ được lưu đồng thời vào Ngân hàng câu hỏi của môn và đưa trực tiếp vào đề thi này.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        1. Chuyên đề lớn <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={newQChapterId}
                        required
                        onChange={(e) => {
                          const chId = e.target.value;
                          setNewQChapterId(chId);
                          const subs = availableTopics.filter((t) => {
                            const pid =
                              typeof t.parent_id === "object" && t.parent_id
                                ? String((t.parent_id as { _id?: string })._id)
                                : String(t.parent_id || "");
                            return pid === chId;
                          });
                          setNewQSubtopicId(subs[0]?._id || "");
                        }}
                        className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer truncate"
                      >
                        <option value="">-- Chọn chuyên đề --</option>
                        {chapters.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.topic_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        2. Dạng bài ôn thi
                      </label>
                      <select
                        value={newQSubtopicId}
                        disabled={newQSubtopics.length === 0}
                        onChange={(e) => setNewQSubtopicId(e.target.value)}
                        className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none disabled:opacity-40 cursor-pointer truncate"
                      >
                        {newQSubtopics.length > 0 ? (
                          newQSubtopics.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.topic_name}
                            </option>
                          ))
                        ) : (
                          <option value="">(Chưa chọn chuyên đề)</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Mức Độ Nhận Thức
                      </label>
                      <select
                        value={newQDifficulty}
                        onChange={(e) => setNewQDifficulty(e.target.value as "easy" | "medium" | "hard")}
                        className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="easy">Dễ (Nhận biết)</option>
                        <option value="medium">Trung bình (Thông hiểu)</option>
                        <option value="hard">Khó (Vận dụng cao)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nội Dung Câu Hỏi <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newQContent}
                      onChange={(e) => setNewQContent(e.target.value)}
                      placeholder="Nhập nội dung câu hỏi đề thi..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none font-medium"
                    />
                  </div>

                  {/* 4 đáp án */}
                  <div className="space-y-2">
                    <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      4 Phương Án Lựa Chọn (Tích tròn chọn đáp án đúng):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {newQOptions.map((opt, oIdx) => (
                        <div
                          key={opt.option_label}
                          className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                          <input
                            type="radio"
                            name="newQCorrectOption"
                            checked={opt.is_correct}
                            onChange={() => {
                              setNewQOptions((prev) =>
                                prev.map((item, i) => ({
                                  ...item,
                                  is_correct: i === oIdx,
                                }))
                              );
                            }}
                            className="w-4 h-4 text-slate-900 cursor-pointer"
                          />
                          <span className="text-xs font-bold w-4 text-slate-700 dark:text-slate-300">
                            {opt.option_label}.
                          </span>
                          <input
                            type="text"
                            required
                            value={opt.content}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewQOptions((prev) =>
                                prev.map((item, i) => (i === oIdx ? { ...item, content: val } : item))
                              );
                            }}
                            placeholder={`Nội dung đáp án ${opt.option_label}...`}
                            className="flex-1 text-xs py-1 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Lời Giải Chi Tiết &amp; Phương Pháp Giải (Không bắt buộc)
                    </label>
                    <textarea
                      rows={2}
                      value={newQExplanation}
                      onChange={(e) => setNewQExplanation(e.target.value)}
                      placeholder="Hướng dẫn phương pháp giải để học sinh đối chiếu sau khi nộp bài..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none font-medium"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isCreatingNewQuestion}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs shadow-2xs transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isCreatingNewQuestion ? "Đang lưu câu hỏi..." : "Lưu Vào Ngân Hàng & Đưa Vào Đề Thi"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: CÂU HỎI ĐÃ CHỌN & SẮP XẾP */}
          {activeTab === "review" && (
            <div className="space-y-4">
              {/* Thống kê & Nút chia đều điểm */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                    Cơ cấu đề thi ({currentExamStats.total} câu)
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <span>🟢 Dễ: <strong>{currentExamStats.easy}</strong></span>
                    <span>🟡 Vừa: <strong>{currentExamStats.medium}</strong></span>
                    <span>🔴 Khó: <strong>{currentExamStats.hard}</strong></span>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span>Tổng điểm: <strong className="text-slate-900 dark:text-white font-bold">{currentExamStats.totalScore} / {maxScore} đ</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSortByDifficulty}
                    title="Sắp xếp câu hỏi từ Dễ đến Khó"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>📊</span>
                    <span>Xếp: Dễ ➔ Khó</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExamQuestions((prev) => distributeScores(prev, maxScore));
                      setAutoDistributeScores(true);
                    }}
                    title="Tự động chia đều điểm các câu theo thang điểm tối đa"
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs shadow-2xs hover:opacity-90 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>⚖️</span>
                    <span>Chia đều điểm (Thang {maxScore})</span>
                  </button>
                </div>
              </div>

              {examQuestions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <span className="text-2xl block mb-1">📭</span>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Chưa có câu hỏi nào trong đề thi</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Vui lòng chuyển sang Tab 2 để chọn thủ công hoặc bốc ngẫu nhiên câu hỏi.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {examQuestions.map((q, idx) => (
                    <div
                      key={`${q.question_id}-${idx}`}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      {/* Header hàng câu hỏi */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                            {q.topic_name || "Chuyên đề"}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.question_snapshot.difficulty_level === "easy"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : q.question_snapshot.difficulty_level === "hard"
                                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                                  : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                              }`}
                          >
                            {q.question_snapshot.difficulty_level === "easy"
                              ? "Dễ"
                              : q.question_snapshot.difficulty_level === "hard"
                                ? "Khó"
                                : "Vừa"}
                          </span>
                          {q.is_custom_edited && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                              Đã sửa đề
                            </span>
                          )}
                        </div>

                        {/* Thao tác: Điểm, Đổi vị trí, Sửa, Xóa */}
                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-400 text-[11px]">Điểm:</span>
                            <input
                              type="number"
                              step={0.1}
                              min={0}
                              value={q.question_score}
                              onChange={(e) => handleUpdateSingleScore(idx, parseFloat(e.target.value) || 0)}
                              className="w-14 text-xs font-bold text-center py-1 px-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveQuestion(idx, "up")}
                              className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                              title="Chuyển lên"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === examQuestions.length - 1}
                              onClick={() => handleMoveQuestion(idx, "down")}
                              className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                              title="Chuyển xuống"
                            >
                              ▼
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenEditQuestion(idx)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                          >
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionFromExam(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                            title="Xóa khỏi đề"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Nội dung câu hỏi */}
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mb-2 leading-relaxed">
                        {q.question_snapshot.content}
                      </p>

                      {/* 4 đáp án */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {q.question_snapshot.options.map((opt) => (
                          <div
                            key={opt.option_label}
                            className={`px-2.5 py-1 rounded-md border text-[11px] truncate flex items-center gap-1.5 ${opt.is_correct
                                ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-medium"
                                : "border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40"
                              }`}
                          >
                            <span className="font-bold">{opt.option_label}.</span>
                            <span className="truncate">{opt.content}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER MODAL - ACTIONS */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-500 text-center sm:text-left flex flex-wrap items-center justify-center sm:justify-start gap-1 sm:gap-1.5">
            <span>Tổng cộng: <strong className="text-slate-900 dark:text-white">{examQuestions.length} câu</strong></span>
            <span>•</span>
            <span>Thang điểm: <strong className={currentExamStats.totalScore === maxScore ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>{currentExamStats.totalScore} / {maxScore} đ</strong></span>
            <span>•</span>
            <span>Thời lượng: <strong>{durationMinutes} phút</strong></span>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="col-span-1 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-center"
            >
              Hủy
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveExam(false)}
              className="col-span-1 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition cursor-pointer text-center"
            >
              {isSubmitting ? "Đang lưu..." : "Lưu Bản Nháp"}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveExam(true)}
              className="col-span-2 sm:col-span-1 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-medium text-xs shadow-2xs transition cursor-pointer text-center"
            >
              {isSubmitting ? "Đang lưu..." : "Lưu & Xuất Bản Đề Thi"}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* POPUP SỬA CÂU HỎI TRONG ĐỀ */}
        {/* ========================================================================= */}
        {editingIndex !== null && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden animate-fade-in">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-850/50">
                <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Sửa Câu Hỏi #{editingIndex + 1} Trong Đề Thi</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nội Dung Câu Hỏi
                  </label>
                  <textarea
                    rows={3}
                    value={editQContent}
                    onChange={(e) => setEditQContent(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mức Độ Nhận Thức
                  </label>
                  <select
                    value={editQDifficulty}
                    onChange={(e) => setEditQDifficulty(e.target.value as "easy" | "medium" | "hard")}
                    className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none"
                  >
                    <option value="easy">Dễ (Nhận biết)</option>
                    <option value="medium">Trung bình (Thông hiểu)</option>
                    <option value="hard">Khó (Vận dụng cao)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    4 Phương Án (Chọn radio để đánh dấu câu đúng):
                  </span>
                  <div className="space-y-1.5">
                    {editQOptions.map((opt, oIdx) => (
                      <div
                        key={opt.option_label}
                        className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <input
                          type="radio"
                          name="editQCorrectOption"
                          checked={opt.is_correct}
                          onChange={() => {
                            setEditQOptions((prev) =>
                              prev.map((item, i) => ({
                                ...item,
                                is_correct: i === oIdx,
                              }))
                            );
                          }}
                          className="w-4 h-4 text-slate-900 cursor-pointer"
                        />
                        <span className="text-xs font-bold w-4 text-slate-700 dark:text-slate-300">
                          {opt.option_label}.
                        </span>
                        <input
                          type="text"
                          value={opt.content}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditQOptions((prev) =>
                              prev.map((item, i) => (i === oIdx ? { ...item, content: val } : item))
                            );
                          }}
                          className="flex-1 text-xs py-1 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Lời Giải Chi Tiết
                  </label>
                  <textarea
                    rows={2}
                    value={editQExplanation}
                    onChange={(e) => setEditQExplanation(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/70 dark:bg-slate-850/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedQuestion}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-medium hover:opacity-90"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExamCreatorModal({
  isOpen,
  onClose,
  onSuccess,
  subjects,
  topics,
  initialExam,
}: ExamCreatorModalProps) {
  if (!isOpen) return null;

  return (
    <ExamCreatorContent
      onClose={onClose}
      onSuccess={onSuccess}
      subjects={subjects}
      topics={topics}
      initialExam={initialExam}
    />
  );
}
