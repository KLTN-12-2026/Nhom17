"use client";

import React, { useState, useMemo } from "react";
import {
  parseQuestionsFromText,
  parseQuestionsFromExcel,
  generateTextTemplate,
  generateExcelTemplateBlob,
  extractTextFromDocx,
  ParsedQuestion,
} from "@/lib/question-parser";

interface SubjectItem {
  _id: string;
  subject_name: string;
}

interface TopicItem {
  _id: string;
  topic_name: string;
  subject_id: string;
  parent_id?: string | null;
  level?: number;
}

interface Option {
  option_label: string;
  content: string;
  is_correct: boolean;
}

interface GeneratedPreviewQuestion {
  id: string;
  selected: boolean;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation: string;
  options: Option[];
}

interface QuestionCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectItem[];
  topics: TopicItem[];
  currentSubjectId?: string;
  defaultTopicId?: string;
  defaultTab?: "manual" | "file" | "ai";
  onSuccess: () => void;
}

export default function QuestionCreationModal({
  isOpen,
  onClose,
  subjects,
  topics,
  currentSubjectId,
  defaultTopicId = "",
  defaultTab = "manual",
  onSuccess,
}: QuestionCreationModalProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "file" | "ai">(defaultTab);

  // 1. Xác định môn học đang chọn (Ưu tiên: currentSubjectId -> môn chứa defaultTopicId -> môn đầu tiên)
  const [activeSubjectId, setActiveSubjectId] = useState<string>(() => {
    if (currentSubjectId) return String(currentSubjectId);
    if (defaultTopicId) {
      const found = topics.find((t) => String(t._id) === String(defaultTopicId));
      if (found) return String(found.subject_id);
    }
    return subjects[0]?._id ? String(subjects[0]._id) : "";
  });

  // 2. Lấy toàn bộ chuyên đề thuộc Môn học đang chọn (Loại bỏ 100% các môn khác khỏi tầm nhìn)
  const activeSubjectTopics = useMemo(() => {
    if (!activeSubjectId) return [];
    return topics.filter((t) => String(t.subject_id) === String(activeSubjectId));
  }, [topics, activeSubjectId]);

  // 3. Phân tách danh sách thành: Chương gốc (Roots / Level 1) và Map các bài con (Children)
  const { rootChapters, childrenMap } = useMemo(() => {
    const idSet = new Set(activeSubjectTopics.map((t) => String(t._id)));
    const roots: TopicItem[] = [];
    const cMap = new Map<string, TopicItem[]>();

    for (const t of activeSubjectTopics) {
      const pId = t.parent_id ? String(t.parent_id) : null;
      if (pId && idSet.has(pId) && pId !== String(t._id)) {
        if (!cMap.has(pId)) cMap.set(pId, []);
        cMap.get(pId)!.push(t);
      } else {
        roots.push(t);
      }
    }

    roots.sort((a, b) => a.topic_name.localeCompare(b.topic_name, "vi"));
    return { rootChapters: roots, childrenMap: cMap };
  }, [activeSubjectTopics]);

  // 4. Khởi tạo Chương đang chọn (selectedRootId) và Chuyên đề đích (selectedTopicId)
  const [selectedRootId, setSelectedRootId] = useState<string>(() => {
    if (defaultTopicId && activeSubjectTopics.some((t) => String(t._id) === String(defaultTopicId))) {
      let curr = activeSubjectTopics.find((t) => String(t._id) === String(defaultTopicId));
      const idSet = new Set(activeSubjectTopics.map((t) => String(t._id)));
      while (curr && curr.parent_id && idSet.has(String(curr.parent_id))) {
        curr = activeSubjectTopics.find((t) => String(t._id) === String(curr?.parent_id));
      }
      return curr?._id || "";
    }
    const idSet = new Set(activeSubjectTopics.map((t) => String(t._id)));
    const firstRoot = activeSubjectTopics.find((t) => !t.parent_id || !idSet.has(String(t.parent_id)));
    return firstRoot?._id || activeSubjectTopics[0]?._id || "";
  });

  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => {
    if (defaultTopicId && activeSubjectTopics.some((t) => String(t._id) === String(defaultTopicId))) {
      return defaultTopicId;
    }
    const idSet = new Set(activeSubjectTopics.map((t) => String(t._id)));
    const firstRoot = activeSubjectTopics.find((t) => !t.parent_id || !idSet.has(String(t.parent_id)));
    if (firstRoot) {
      const firstChild = activeSubjectTopics.find((t) => String(t.parent_id) === String(firstRoot._id));
      if (firstChild) return firstChild._id;
      return firstRoot._id;
    }
    return activeSubjectTopics[0]?._id || "";
  });

  // 5. Danh sách bài học con thuộc riêng Chương gốc đang chọn (Tầng 2)
  const currentChapterLessons = useMemo(() => {
    if (!selectedRootId) return [];
    const list: { _id: string; label: string; depth: number }[] = [];

    function traverse(parentId: string, depth: number) {
      const kids = childrenMap.get(String(parentId)) || [];
      kids.sort((a, b) => a.topic_name.localeCompare(b.topic_name, "vi"));
      for (const kid of kids) {
        const indent = depth === 1 ? "↳ " : `${"\u00A0\u00A0".repeat(depth - 1)}↳ `;
        list.push({
          _id: kid._id,
          label: `${indent}${kid.topic_name}`,
          depth,
        });
        traverse(kid._id, depth + 1);
      }
    }

    traverse(selectedRootId, 1);
    return list;
  }, [selectedRootId, childrenMap]);

  // Bộ chuyển đổi Môn học
  const handleSubjectChange = (newSubId: string) => {
    setActiveSubjectId(newSubId);
    const subTopics = topics.filter((t) => String(t.subject_id) === String(newSubId));
    const idSet = new Set(subTopics.map((t) => String(t._id)));
    const firstRoot = subTopics.find((t) => !t.parent_id || !idSet.has(String(t.parent_id))) || subTopics[0];
    const newRootId = firstRoot?._id || "";
    setSelectedRootId(newRootId);
    const firstChild = subTopics.find((t) => String(t.parent_id) === String(newRootId));
    setSelectedTopicId(firstChild?._id || newRootId);
  };

  // Bộ chuyển đổi Chương lớn
  const handleChapterChange = (newRootId: string) => {
    setSelectedRootId(newRootId);
    const kids = childrenMap.get(String(newRootId)) || [];
    kids.sort((a, b) => a.topic_name.localeCompare(b.topic_name, "vi"));
    if (kids.length > 0) {
      setSelectedTopicId(kids[0]._id);
    } else {
      setSelectedTopicId(newRootId);
    }
  };

  // Bộ chuyển đổi Bài học cụ thể
  const handleLessonChange = (newTopicId: string) => {
    setSelectedTopicId(newTopicId);
  };

  // =========================================================================
  // TAB 1: SOẠN THỦ CÔNG (TẠO TAY)
  // =========================================================================
  const [manualContent, setManualContent] = useState("");
  const [manualDifficulty, setManualDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [manualExplanation, setManualExplanation] = useState("");
  const [manualOptions, setManualOptions] = useState<Option[]>([
    { option_label: "A", content: "", is_correct: true },
    { option_label: "B", content: "", is_correct: false },
    { option_label: "C", content: "", is_correct: false },
    { option_label: "D", content: "", is_correct: false },
  ]);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");

  const handleManualOptionChange = (idx: number, content: string) => {
    setManualOptions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], content };
      return next;
    });
  };

  const handleManualSetCorrect = (idx: number) => {
    setManualOptions((prev) =>
      prev.map((opt, i) => ({
        ...opt,
        is_correct: i === idx,
      }))
    );
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError("");

    if (!selectedTopicId) {
      setManualError("Vui lòng chọn chuyên đề cho câu hỏi.");
      return;
    }
    if (!manualContent.trim()) {
      setManualError("Vui lòng nhập nội dung đề bài câu hỏi.");
      return;
    }
    const emptyOpt = manualOptions.some((o) => !o.content.trim());
    if (emptyOpt) {
      setManualError("Mỗi câu hỏi phải có đủ 4 phương án lựa chọn và không được để trống ô nào.");
      return;
    }
    if (!manualOptions.some((o) => o.is_correct)) {
      setManualError("Bắt buộc phải đánh dấu một đáp án đúng.");
      return;
    }

    setManualSubmitting(true);
    try {
      const res = await fetch("/api/instructor/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: selectedTopicId,
          content: manualContent.trim(),
          difficulty_level: manualDifficulty,
          explanation: manualExplanation.trim(),
          is_ai_generated: false,
          options: manualOptions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setManualContent("");
        setManualExplanation("");
        setManualOptions([
          { option_label: "A", content: "", is_correct: true },
          { option_label: "B", content: "", is_correct: false },
          { option_label: "C", content: "", is_correct: false },
          { option_label: "D", content: "", is_correct: false },
        ]);
        onSuccess();
        onClose();
      } else {
        setManualError(data.message || "Lỗi khi lưu câu hỏi");
      }
    } catch {
      setManualError("Lỗi kết nối máy chủ");
    } finally {
      setManualSubmitting(false);
    }
  };

  // =========================================================================
  // TAB 2: NẠP TỪ FILE CHUẨN (EXCEL / WORD / TEXT)
  // =========================================================================
  const [importMode, setImportMode] = useState<"file" | "paste">("file");
  const [importFileName, setImportFileName] = useState("");
  const [importPastedText, setImportPastedText] = useState("");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [importError, setImportError] = useState("");
  const [isSavingImport, setIsSavingImport] = useState(false);

  const handleDownloadTxt = () => {
    const text = generateTextTemplate();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mau_Cau_Hoi_THPT.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = () => {
    const blob = generateExcelTemplateBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mau_Cau_Hoi_THPT.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setImportError("");
    setImportFileName(file.name);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let list: ParsedQuestion[] = [];

      if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        const buffer = await file.arrayBuffer();
        list = parseQuestionsFromExcel(buffer);
      } else if (ext === "docx") {
        const buffer = await file.arrayBuffer();
        const text = await extractTextFromDocx(buffer);
        list = parseQuestionsFromText(text);
      } else {
        // txt, md
        const text = await file.text();
        list = parseQuestionsFromText(text);
      }

      if (list.length === 0) {
        setImportError("Không tìm thấy câu hỏi trắc nghiệm nào trong tệp. Hãy kiểm tra lại định dạng tệp mẫu.");
      }
      setParsedQuestions(list);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Lỗi khi đọc tệp.");
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleParsePasted = () => {
    if (!importPastedText.trim()) {
      setImportError("Vui lòng dán nội dung văn bản chứa câu hỏi.");
      return;
    }
    setIsParsingFile(true);
    setImportError("");
    try {
      const list = parseQuestionsFromText(importPastedText);
      if (list.length === 0) {
        setImportError("Không phân tích được câu hỏi nào. Hãy kiểm tra lại theo đúng định dạng mẫu: Câu 1: ... A. ... B. ...");
      }
      setParsedQuestions(list);
    } finally {
      setIsParsingFile(false);
    }
  };

  const toggleSelectParsed = (id: string) => {
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q))
    );
  };

  const toggleSelectAllParsed = (selectAll: boolean) => {
    setParsedQuestions((prev) =>
      prev.map((q) => (q.isValid ? { ...q, selected: selectAll } : q))
    );
  };

  const handleUpdateParsedDifficulty = (id: string, newDiff: "easy" | "medium" | "hard") => {
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, difficulty_level: newDiff } : q))
    );
  };

  const handleSaveImported = async () => {
    const validSelected = parsedQuestions.filter((q) => q.selected && q.isValid);
    if (validSelected.length === 0) {
      setImportError("Vui lòng chọn ít nhất một câu hỏi hợp lệ để nạp.");
      return;
    }
    if (!selectedTopicId) {
      setImportError("Vui lòng chọn chuyên đề để nạp câu hỏi.");
      return;
    }

    setIsSavingImport(true);
    setImportError("");
    try {
      const res = await fetch("/api/instructor/questions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: selectedTopicId,
          is_ai_generated: false,
          questions: validSelected.map((q) => ({
            content: q.content,
            difficulty_level: q.difficulty_level,
            explanation: q.explanation,
            options: q.options,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setParsedQuestions([]);
        setImportFileName("");
        setImportPastedText("");
        onSuccess();
        onClose();
      } else {
        setImportError(data.message || "Lỗi khi lưu câu hỏi");
      }
    } catch {
      setImportError("Lỗi kết nối máy chủ");
    } finally {
      setIsSavingImport(false);
    }
  };

  // =========================================================================
  // TAB 3: AI SINH ĐỀ (THEO BÀI HỌC HOẶC ĐỌC TÀI LIỆU)
  // =========================================================================
  const [aiMode, setAiMode] = useState<"topic" | "document">("topic");
  const [aiDocFileName, setAiDocFileName] = useState("");
  const [aiPromptText, setAiPromptText] = useState("");
  const [aiCount, setAiCount] = useState<number>(3);
  const [aiDifficulty, setAiDifficulty] = useState<string>("mixed");
  const [aiGrade, setAiGrade] = useState<string>("Ôn thi Tốt nghiệp THPT Quốc Gia");
  const [aiQuestionFocus, setAiQuestionFocus] = useState<string>("comprehensive");
  const [isCustomTopicName, setIsCustomTopicName] = useState(false);
  const [customTopicName, setCustomTopicName] = useState("");
  const [isReadingDoc, setIsReadingDoc] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiStep, setAiStep] = useState<"input" | "preview">("input");
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<GeneratedPreviewQuestion[]>([]);
  const [isAiSaving, setIsAiSaving] = useState(false);

  const handleAiDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingDoc(true);
    setAiError("");
    setAiDocFileName(file.name);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let extracted = "";
      if (ext === "docx") {
        const buffer = await file.arrayBuffer();
        extracted = await extractTextFromDocx(buffer);
      } else {
        // txt, md
        extracted = await file.text();
      }
      setAiPromptText(extracted);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Lỗi khi đọc file tài liệu.");
    } finally {
      setIsReadingDoc(false);
    }
  };

  const handleGenerateAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) {
      setAiError("Vui lòng chọn chuyên đề bài học cần sinh câu hỏi.");
      return;
    }
    setAiError("");
    setIsAiGenerating(true);

    const currentTopicObj = topics.find((t) => t._id === selectedTopicId);
    const resolvedTopicName = isCustomTopicName && customTopicName.trim()
      ? customTopicName.trim()
      : currentTopicObj?.topic_name || "Bài học THPT";

    try {
      const res = await fetch("/api/instructor/questions/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: aiPromptText.trim(),
          topicId: selectedTopicId,
          customTopicName: resolvedTopicName,
          grade: aiGrade,
          count: aiCount,
          difficulty: aiDifficulty,
          questionFocus: aiQuestionFocus,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        const previewList: GeneratedPreviewQuestion[] = data.questions.map(
          (q: { content: string; difficulty_level: "easy" | "medium" | "hard"; explanation: string; options: Option[] }, index: number) => ({
            id: `ai-gen-${Date.now()}-${index}`,
            selected: true,
            content: q.content,
            difficulty_level: q.difficulty_level || "medium",
            explanation: q.explanation || "",
            options: q.options,
          })
        );
        setAiGeneratedQuestions(previewList);
        setAiStep("preview");
      } else {
        setAiError(data.message || "Không thể sinh câu hỏi bằng AI lúc này.");
      }
    } catch {
      setAiError("Lỗi kết nối khi gửi yêu cầu tới Trợ lý AI.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const toggleSelectAi = (id: string) => {
    setAiGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q))
    );
  };

  const toggleSelectAllAi = (selectAll: boolean) => {
    setAiGeneratedQuestions((prev) => prev.map((q) => ({ ...q, selected: selectAll })));
  };

  const handleUpdateAiDifficulty = (id: string, newDiff: "easy" | "medium" | "hard") => {
    setAiGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, difficulty_level: newDiff } : q))
    );
  };

  const handleSaveAiQuestions = async () => {
    const selectedList = aiGeneratedQuestions.filter((q) => q.selected);
    if (selectedList.length === 0) {
      setAiError("Vui lòng chọn ít nhất một câu hỏi để lưu.");
      return;
    }
    if (!selectedTopicId) {
      setAiError("Vui lòng chọn chuyên đề để lưu câu hỏi.");
      return;
    }

    setIsAiSaving(true);
    setAiError("");
    try {
      const res = await fetch("/api/instructor/questions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: selectedTopicId,
          is_ai_generated: true,
          questions: selectedList.map((q) => ({
            content: q.content,
            difficulty_level: q.difficulty_level,
            explanation: q.explanation,
            options: q.options,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiStep("input");
        setAiGeneratedQuestions([]);
        setAiPromptText("");
        setAiDocFileName("");
        onSuccess();
        onClose();
      } else {
        setAiError(data.message || "Lỗi khi lưu câu hỏi");
      }
    } catch {
      setAiError("Lỗi kết nối máy chủ");
    } finally {
      setIsAiSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-850/30">
          <div>
            <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white">
              Thêm Câu Hỏi Vào Ngân Hàng
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn 1 trong 3 phương thức: Soạn thủ công, Nạp từ tệp tin hoặc Dùng AI trích xuất tự động
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-lg cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Target Topic Selection Bar (Phân tầng liên hoàn: Môn -> Chương -> Bài) */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center gap-3 shrink-0 text-xs">
          {/* 1. Môn học */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Môn:</span>
            {subjects.length > 1 ? (
              <select
                value={activeSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-slate-400 cursor-pointer shadow-2xs"
              >
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.subject_name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {subjects.find((s) => String(s._id) === String(activeSubjectId))?.subject_name || "Môn học"}
              </span>
            )}
          </div>

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

          {/* 2. Chương / Chuyên đề gốc (Tầng 1) */}
          <div className="flex items-center gap-1.5 min-w-[200px] flex-1">
            <span className="font-medium text-slate-600 dark:text-slate-400 shrink-0">Chương:</span>
            <select
              value={selectedRootId}
              onChange={(e) => handleChapterChange(e.target.value)}
              className="w-full text-xs py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-slate-400 cursor-pointer shadow-2xs truncate"
            >
              {rootChapters.length > 0 ? (
                rootChapters.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.topic_name}
                  </option>
                ))
              ) : (
                <option value="">(Chưa có chương nào)</option>
              )}
            </select>
          </div>

          {/* 3. Bài học chi tiết (Tầng 2 - chỉ hiển thị các bài con của chương đã chọn) */}
          {currentChapterLessons.length > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5 min-w-[220px] flex-1">
                <span className="font-medium text-slate-600 dark:text-slate-400 shrink-0">Bài học:</span>
                <select
                  value={selectedTopicId}
                  onChange={(e) => handleLessonChange(e.target.value)}
                  className="w-full text-xs py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-slate-400 cursor-pointer shadow-2xs truncate"
                >
                  {currentChapterLessons.map((lesson) => (
                    <option key={lesson._id} value={lesson._id}>
                      {lesson.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="text-[11px] text-slate-400 shrink-0 ml-auto hidden xl:inline">
            Câu hỏi sẽ được gắn vào chuyên đề này
          </div>
        </div>

        {/* 3 Tabs Navigation Bar */}
        <div className="px-4 sm:px-5 pt-2 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-t-lg transition cursor-pointer border-b-2 ${
                activeTab === "manual"
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold bg-white dark:bg-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <span>1. Soạn thủ công</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-t-lg transition cursor-pointer border-b-2 ${
                activeTab === "file"
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold bg-white dark:bg-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <span>2. Nạp từ tệp tin (Excel / Word)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-t-lg transition cursor-pointer border-b-2 ${
                activeTab === "ai"
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold bg-white dark:bg-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <span>3. AI trích xuất tự động</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {/* ================================================================= */}
          {/* TAB 1: SOẠN THỦ CÔNG */}
          {/* ================================================================= */}
          {activeTab === "manual" && (
            <form onSubmit={handleSubmitManual} className="space-y-4">
              {manualError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {manualError}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nội Dung Đề Bài Câu Hỏi <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {manualContent.includes("\n") && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualContent((prev) =>
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
                      <span>Gộp dòng thừa</span>
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Mức độ:</span>
                    <select
                      value={manualDifficulty}
                      onChange={(e) => setManualDifficulty(e.target.value as "easy" | "medium" | "hard")}
                      className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    >
                      <option value="easy">Dễ (Nhận biết)</option>
                      <option value="medium">Trung bình (Thông hiểu)</option>
                      <option value="hard">Khó (Vận dụng cao)</option>
                    </select>
                  </div>
                </div>
              </div>

              <textarea
                rows={4}
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="Nhập câu hỏi trắc nghiệm, bài toán, công thức..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 leading-relaxed min-h-[110px] resize-y"
              />

              {/* 4 Options Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  4 Phương Án Lựa Chọn (Tích tròn chọn đáp án đúng):
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {manualOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                        opt.is_correct
                          ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50/30"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleManualSetCorrect(idx)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer transition ${
                          opt.is_correct
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 hover:bg-slate-300"
                        }`}
                        title="Bấm để đặt làm đáp án đúng"
                      >
                        {opt.option_label}
                      </button>
                      <input
                        type="text"
                        value={opt.content}
                        onChange={(e) => handleManualOptionChange(idx, e.target.value)}
                        placeholder={`Nội dung phương án ${opt.option_label}...`}
                        className="flex-1 text-xs bg-transparent focus:outline-none"
                      />
                      {opt.is_correct && (
                        <span className="text-[10px] font-bold text-emerald-600 shrink-0">
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
                    Phương Pháp Giải &amp; Lời Giải Chi Tiết
                  </label>
                  <div className="flex items-center gap-2">
                    {manualExplanation.includes("\n") && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualExplanation((prev) =>
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
                        <span>Gộp dòng thừa</span>
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400">Không bắt buộc</span>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={manualExplanation}
                  onChange={(e) => setManualExplanation(e.target.value)}
                  placeholder="Nhập lời giải hoặc các bước giải chi tiết (Ví dụ: Bước 1: Tính đạo hàm y' = 3x^2 - 6x, Bước 2: Cho y' = 0 <=> x = 0 hoặc x = 2...)"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 leading-relaxed min-h-[100px] resize-y"
                />
                <p className="mt-1 text-[11px] text-slate-400 leading-normal">
                  Học sinh sẽ xem được phần giải thích này sau khi hoàn thành bài thi để đối chiếu phương pháp giải.
                </p>
              </div>

              <div className="sticky bottom-0 z-10 bg-white dark:bg-slate-900 pt-3 pb-1 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 -mx-4 sm:-mx-5 px-4 sm:px-5 mt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-5 py-2.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-50 rounded-xl cursor-pointer shadow-xs transition"
                >
                  {manualSubmitting ? "Đang lưu..." : "Lưu Câu Hỏi Vào Kho"}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: NẠP TỪ FILE CHUẨN */}
          {/* ========================================================================= */}
          {activeTab === "file" && (
            <div className="space-y-4">
              {/* Template Download Banner */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Mẹo: Nạp hàng loạt 50 - 100 câu hỏi nhanh chóng
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hỗ trợ file bảng tính Excel (.xlsx, .csv) hoặc văn bản Word (.docx, .txt) theo định dạng chuẩn.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  >
                    Tải mẫu Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  >
                    Tải mẫu Text (.txt)
                  </button>
                </div>
              </div>

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {importError}
                </div>
              )}

              {/* Mode switch: Upload file OR paste text */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setImportMode("file")}
                  className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition ${
                    importMode === "file"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Chọn tệp từ máy (.xlsx, .docx, .txt)
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("paste")}
                  className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition ${
                    importMode === "paste"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Dán nội dung trực tiếp
                </button>
              </div>

              {/* Upload File Input */}
              {importMode === "file" && (
                <div className="border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 rounded-xl p-6 text-center transition bg-slate-50/50 dark:bg-slate-850/20">
                  <input
                    type="file"
                    id="import-file-input"
                    accept=".xlsx,.xls,.csv,.docx,.txt,.md"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="import-file-input" className="cursor-pointer block">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Bấm để chọn file hoặc kéo thả file vào đây
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Định dạng hỗ trợ: .xlsx (Excel), .docx (Word), .txt, .csv
                    </p>
                    {importFileName && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-medium">
                        <span>Đã chọn:</span> {importFileName}
                      </div>
                    )}
                  </label>
                </div>
              )}

              {/* Paste Text Input */}
              {importMode === "paste" && (
                <div className="space-y-2">
                  <textarea
                    rows={6}
                    value={importPastedText}
                    onChange={(e) => setImportPastedText(e.target.value)}
                    placeholder="Dán nội dung đề bài theo mẫu:&#10;Câu 1: Đề bài...&#10;A. Đáp án 1&#10;*B. Đáp án đúng&#10;C. Đáp án 3&#10;D. Đáp án 4&#10;Lời giải: ..."
                    className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParsePasted}
                      disabled={isParsingFile}
                      className="px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 rounded-lg cursor-pointer"
                    >
                      {isParsingFile ? "Đang đọc..." : "Phân Tích Cú Pháp Câu Hỏi"}
                    </button>
                  </div>
                </div>
              )}

              {/* Parsed Preview Table / Cards */}
              {parsedQuestions.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Đã đọc được {parsedQuestions.length} câu hỏi. (Hợp lệ:{" "}
                      {parsedQuestions.filter((q) => q.isValid).length} câu - Đã chọn:{" "}
                      {parsedQuestions.filter((q) => q.selected && q.isValid).length} câu)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectAllParsed(true)}
                        className="px-2.5 py-1 text-xs bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 rounded font-medium cursor-pointer"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSelectAllParsed(false)}
                        className="px-2.5 py-1 text-xs bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-medium cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                    {parsedQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        className={`p-3.5 rounded-xl border text-xs transition-all ${
                          !q.isValid
                            ? "border-rose-300 bg-rose-50/40"
                            : q.selected
                            ? "border-emerald-300 bg-white dark:bg-slate-800"
                            : "border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-700">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.selected && q.isValid}
                              disabled={!q.isValid}
                              onChange={() => toggleSelectParsed(q.id)}
                              className="w-4 h-4 rounded text-emerald-600"
                            />
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Câu {idx + 1}
                            </span>
                          </label>

                          <div className="flex items-center gap-2">
                            <select
                              value={q.difficulty_level}
                              onChange={(e) => handleUpdateParsedDifficulty(q.id, e.target.value as "easy" | "medium" | "hard")}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer focus:outline-none transition ${
                                q.difficulty_level === "easy"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                  : q.difficulty_level === "hard"
                                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              }`}
                              title="Bấm để điều chỉnh mức độ khó của câu hỏi này"
                            >
                              <option value="easy">Dễ (Nhận biết)</option>
                              <option value="medium">TB (Thông hiểu)</option>
                              <option value="hard">Khó (Vận dụng)</option>
                            </select>
                            {!q.isValid && (
                              <span className="text-[10px] font-medium text-rose-600">
                                {q.errors.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="font-medium text-slate-900 dark:text-slate-100 mb-2 leading-relaxed">
                          {q.content}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-1.5 px-2.5 rounded-lg text-[11px] flex items-center justify-between ${
                                opt.is_correct
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold border border-emerald-200 dark:border-emerald-800"
                                  : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <span>
                                <strong>{opt.option_label}.</strong> {opt.content || "(Trống)"}
                              </span>
                              {opt.is_correct && <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓</span>}
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <div className="mt-2 text-[11px] text-slate-500 italic">
                            Lời giải: {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="sticky bottom-0 z-10 bg-white dark:bg-slate-900 pt-3 pb-1 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 -mx-4 sm:-mx-5 px-4 sm:px-5 mt-3">
                    <button
                      type="button"
                      onClick={() => setParsedQuestions([])}
                      className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Xóa danh sách xem trước
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveImported}
                      disabled={isSavingImport || parsedQuestions.filter((q) => q.selected && q.isValid).length === 0}
                      className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 rounded-lg cursor-pointer"
                    >
                      {isSavingImport
                        ? "Đang lưu..."
                        : `Nạp ${parsedQuestions.filter((q) => q.selected && q.isValid).length} câu hợp lệ vào kho`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: AI ĐỌC TÀI LIỆU & TỰ ĐỘNG SINH ĐỀ */}
          {/* ========================================================================= */}
          {activeTab === "ai" && (
            <div>
              {aiStep === "input" && (
                <form onSubmit={handleGenerateAi} className="space-y-4">
                  {aiError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                      {aiError}
                    </div>
                  )}

                  {/* Chế độ sinh câu hỏi: Theo bài học SGK vs Đọc tài liệu riêng */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAiMode("topic")}
                      className={`flex items-start gap-3 p-3 rounded-lg text-xs transition cursor-pointer text-left ${
                        aiMode === "topic"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200/90 dark:border-slate-700 font-medium"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">1. Sinh theo bài học chương trình</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Tự động bám sát ma trận và chuẩn kiến thức trọng tâm</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAiMode("document")}
                      className={`flex items-start gap-3 p-3 rounded-lg text-xs transition cursor-pointer text-left ${
                        aiMode === "document"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200/90 dark:border-slate-700 font-medium"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">2. Đọc tài liệu / đề cương riêng</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Trích xuất câu hỏi từ file Word/PDF hoặc bài đọc dán vào</div>
                      </div>
                    </button>
                  </div>

                  {/* Cấu hình cơ bản: Số lượng và Độ khó */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Mục Tiêu &amp; Trọng Tâm Ôn Luyện:
                      </label>
                      <select
                        value={aiGrade}
                        onChange={(e) => setAiGrade(e.target.value)}
                        className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 font-medium"
                      >
                        <optgroup label="Kỳ thi Tuyển sinh &amp; Đại học (Trọng tâm)">
                          <option value="Ôn thi Tốt nghiệp THPT Quốc Gia">Ôn thi Tốt nghiệp THPT Quốc Gia</option>
                          <option value="Luyện thi Đánh Giá Năng Lực (ĐGNL / ĐGTD)">Luyện thi Đánh Giá Năng Lực (ĐGNL / ĐGTD)</option>
                        </optgroup>
                        <optgroup label="Ôn tập bám sát chương trình khối lớp">
                          <option value="Lớp 12 (Trọng tâm thi THPT)">Lớp 12 (Trọng tâm thi THPT)</option>
                          <option value="Lớp 11 (Kiến thức nền tảng)">Lớp 11 (Kiến thức nền tảng)</option>
                          <option value="Lớp 10 (Khởi động THPT)">Lớp 10 (Khởi động THPT)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Mức Độ Khó Nhận Thức:
                      </label>
                      <select
                        value={aiDifficulty}
                        onChange={(e) => setAiDifficulty(e.target.value)}
                        className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 font-medium"
                      >
                        <option value="mixed">Phân bổ đều (Chuẩn đề thi)</option>
                        <option value="easy">Nhận biết (Dễ - Củng cố nền tảng)</option>
                        <option value="medium">Thông hiểu & Vận dụng (Trung bình)</option>
                        <option value="hard">Vận dụng cao (Khó - Phân loại)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Số Lượng Câu Hỏi:
                      </label>
                      <select
                        value={aiCount}
                        onChange={(e) => setAiCount(Number(e.target.value))}
                        className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 font-medium"
                      >
                        <option value={3}>3 câu hỏi (Sinh nhanh & Tối ưu)</option>
                        <option value={5}>5 câu hỏi (Chuẩn 1 bài học)</option>
                        <option value={10}>10 câu hỏi (Gói bài tập luyện tập)</option>
                        <option value={15}>15 câu hỏi (Đề kiểm tra 1 tiết)</option>
                        <option value={20}>20 câu hỏi (Bộ đề chuyên sâu)</option>
                      </select>
                    </div>
                  </div>

                  {/* Body theo chế độ đã chọn */}
                  {aiMode === "topic" ? (
                    <div className="space-y-3">
                      {/* Topic Card & Custom Topic Toggle */}
                      <div className="p-3 bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Trọng tâm bài học trích xuất:
                          </span>
                          <div className="inline-flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomTopicName(false);
                                setCustomTopicName("");
                              }}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                !isCustomTopicName
                                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                              }`}
                            >
                              Theo chuyên đề đã chọn
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsCustomTopicName(true)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                isCustomTopicName
                                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                              }`}
                            >
                              Tự nhập bài học riêng
                            </button>
                          </div>
                        </div>

                        {!isCustomTopicName ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-xs text-slate-800 dark:text-slate-200">
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {topics.find((t) => t._id === selectedTopicId)?.topic_name || "Bài học THPT"}
                            </span>
                            <span className="text-[11px] text-slate-400 ml-auto shrink-0 hidden sm:inline">
                              (Bám sát chuẩn kiến thức &amp; ma trận đề thi)
                            </span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={customTopicName}
                            onChange={(e) => setCustomTopicName(e.target.value)}
                            placeholder="Ví dụ: Bài 1: Este - Lipit, Khảo sát hàm số bậc ba, Dao động điều hòa..."
                            autoFocus
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 font-medium"
                          />
                        )}
                      </div>

                      {/* Quick Focus Tags */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Định Hướng Dạng Câu Hỏi:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { key: "comprehensive", label: "Cân đối toàn diện (Chuẩn ma trận)" },
                            { key: "theory", label: "Lý thuyết & Bản chất hiện tượng" },
                            { key: "exercise", label: "Bài tập tính toán & Công thức" },
                            { key: "trap", label: "Bẫy nhận thức & Điểm liệt" },
                            { key: "graph", label: "Đồ thị & Hiện tượng thực tế" },
                          ].map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setAiQuestionFocus(item.key)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                                aiQuestionFocus === item.key
                                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Optional Notes */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Yêu Cầu Trọng Tâm Hoặc Lưu Ý Thêm (Tùy chọn):
                        </label>
                        <input
                          type="text"
                          value={aiPromptText}
                          onChange={(e) => setAiPromptText(e.target.value)}
                          placeholder="Ví dụ: Cho thêm 1 câu liên hệ thực tiễn, giải thích phương pháp giải chi tiết..."
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Document Upload for AI */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Tải tệp tài liệu cho AI đọc (.docx, .txt, .pdf):
                          </label>
                          <input
                            type="file"
                            id="ai-doc-input"
                            accept=".docx,.txt,.md,.pdf"
                            onChange={handleAiDocUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="ai-doc-input"
                            className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 cursor-pointer"
                          >
                            {isReadingDoc ? "Đang trích xuất..." : "Chọn Tệp Tài Liệu"}
                          </label>
                        </div>
                        {aiDocFileName && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Đã trích xuất nội dung từ tệp: <strong>{aiDocFileName}</strong>
                          </p>
                        )}
                      </div>

                      {/* Textarea for document content or notes */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Nội Dung Bài Đọc / Giáo Án / Đề Cương (Hoặc dán văn bản bài đọc):
                        </label>
                        <textarea
                          rows={4}
                          value={aiPromptText}
                          onChange={(e) => setAiPromptText(e.target.value)}
                          placeholder="Dán nội dung lý thuyết, bài đọc tiếng Anh, đoạn văn trích dẫn hoặc tài liệu để AI tự động trích xuất các ý và sinh câu hỏi..."
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 focus:outline-none focus:border-slate-400 leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  <div className="sticky bottom-0 z-10 bg-white dark:bg-slate-900 pt-3 pb-1 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 -mx-4 sm:-mx-5 px-4 sm:px-5 mt-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isAiGenerating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-50 rounded-xl cursor-pointer shadow-xs transition"
                    >
                      {isAiGenerating ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin" />
                          <span>AI đang phân tích &amp; sinh câu hỏi...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>
                            {aiMode === "topic"
                              ? `Sinh câu hỏi theo "${
                                  isCustomTopicName && customTopicName.trim()
                                    ? customTopicName.trim()
                                    : topics.find((t) => t._id === selectedTopicId)?.topic_name || "Bài học"
                                }"`
                              : "Đọc tài liệu & Trích xuất câu hỏi"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* AI Preview Step */}
              {aiStep === "preview" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      AI đã tạo {aiGeneratedQuestions.length} câu hỏi. (Đã chọn{" "}
                      {aiGeneratedQuestions.filter((q) => q.selected).length} câu để lưu)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectAllAi(true)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-600 font-medium cursor-pointer"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSelectAllAi(false)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-600 font-medium cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                    {aiGeneratedQuestions.map((q, qIndex) => (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border transition-all ${
                          q.selected
                            ? "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-850"
                            : "border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.selected}
                              onChange={() => toggleSelectAi(q.id)}
                              className="w-4 h-4 rounded text-purple-600"
                            />
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              Câu {qIndex + 1}
                            </span>
                          </label>
                          <select
                            value={q.difficulty_level}
                            onChange={(e) => handleUpdateAiDifficulty(q.id, e.target.value as "easy" | "medium" | "hard")}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer focus:outline-none transition ${
                              q.difficulty_level === "easy"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : q.difficulty_level === "hard"
                                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            }`}
                            title="Bấm để điều chỉnh mức độ khó của câu hỏi này"
                          >
                            <option value="easy">Dễ (Nhận biết)</option>
                            <option value="medium">TB (Thông hiểu)</option>
                            <option value="hard">Khó (Vận dụng)</option>
                          </select>
                        </div>

                        <p className="font-medium text-xs text-slate-900 dark:text-slate-100 mb-2 leading-relaxed">
                          {q.content}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-lg text-xs flex items-center justify-between ${
                                opt.is_correct
                                  ? "bg-emerald-100/70 text-emerald-900 font-semibold"
                                  : "bg-slate-100/70 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <span>
                                <strong>{opt.option_label}.</strong> {opt.content}
                              </span>
                              {opt.is_correct && <span className="text-emerald-700 font-bold">✓ Đáp án đúng</span>}
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500">
                            <strong>Lời giải:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="sticky bottom-0 z-10 bg-white dark:bg-slate-900 pt-3 pb-1 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center -mx-4 sm:-mx-5 px-4 sm:px-5 mt-3">
                    <button
                      type="button"
                      onClick={() => setAiStep("input")}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      ← Nhập tài liệu khác
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAiQuestions}
                      disabled={isAiSaving || aiGeneratedQuestions.filter((q) => q.selected).length === 0}
                      className="px-5 py-2.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-50 rounded-xl cursor-pointer shadow-xs transition"
                    >
                      {isAiSaving
                        ? "Đang lưu..."
                        : `Lưu ${aiGeneratedQuestions.filter((q) => q.selected).length} câu đã chọn vào kho`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
