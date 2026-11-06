"use client";

import React, { useState, useEffect, useMemo } from "react";

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
  };
}

export interface ExamDataToEdit {
  _id?: string;
  title: string;
  subject_id: string | { _id: string; subject_name: string };
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

export default function ExamCreatorModal({
  isOpen,
  onClose,
  onSuccess,
  subjects,
  topics,
  initialExam,
}: ExamCreatorModalProps) {
  // ==========================================
  // 1. CẤU HÌNH ĐỀ THI
  // ==========================================
  const [title, setTitle] = useState(initialExam?.title || "");
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    typeof initialExam?.subject_id === "object"
      ? initialExam?.subject_id?._id || ""
      : initialExam?.subject_id || (subjects[0]?._id || ""),
  );
  const [durationMinutes, setDurationMinutes] = useState(initialExam?.duration_minutes || 45);
  const [passScore, setPassScore] = useState(initialExam?.pass_score || 5.0);
  const [maxScore, setMaxScore] = useState(initialExam?.max_score || 10.0);
  const [shuffleQuestions, setShuffleQuestions] = useState(
    initialExam?.shuffle_questions !== undefined ? initialExam.shuffle_questions : true,
  );
  const [shuffleOptions, setShuffleOptions] = useState(
    initialExam?.shuffle_options !== undefined ? initialExam.shuffle_options : true,
  );
  const [allowViewResult, setAllowViewResult] = useState(
    initialExam?.allow_view_result_immediately !== undefined
      ? initialExam.allow_view_result_immediately
      : true,
  );

  // ==========================================
  // 2. DANH SÁCH CÂU HỎI TRONG ĐỀ THI
  // ==========================================
  const [examQuestions, setExamQuestions] = useState<ExamQuestionEntry[]>([]);

  // ==========================================
  // 3. TAB ĐIỀU HƯỚNG
  // ==========================================
  const [activeTab, setActiveTab] = useState<"config" | "add_questions" | "review">("config");
  const [addMode, setAddMode] = useState<"manual" | "random" | "create_new">("manual");

  // ==========================================
  // 4. BỘ LỌC CHỌN THỦ CÔNG
  // ==========================================
  const [bankQuestions, setBankQuestions] = useState<QuestionBankItem[]>([]);
  const [isLoadingBankQuestions, setIsLoadingBankQuestions] = useState(false);
  const [manualFilterTopic, setManualFilterTopic] = useState("all");
  const [manualFilterDifficulty, setManualFilterDifficulty] = useState("all");
  const [manualSearchQuery, setManualSearchQuery] = useState("");

  // ==========================================
  // 5. BỐC NGẪU NHIÊN THEO MA TRẬN ĐỘ KHÓ
  // ==========================================
  const [randomTopicId, setRandomTopicId] = useState("all");
  const [randomEasyCount, setRandomEasyCount] = useState(0);
  const [randomMediumCount, setRandomMediumCount] = useState(0);
  const [randomHardCount, setRandomHardCount] = useState(0);
  const [isRandomPicking, setIsRandomPicking] = useState(false);
  const [randomPickMessage, setRandomPickMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // ==========================================
  // 6. SOẠN CÂU HỎI MỚI TRỰC TIẾP
  // ==========================================
  const [newQTopicId, setNewQTopicId] = useState("");
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
  // 7. SỬA CÂU HỎI & ĐÁP ÁN TRONG ĐỀ THI
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

  // Lọc các chuyên đề thuộc môn học đang chọn
  const availableTopics = useMemo(() => {
    if (!selectedSubjectId) return [];
    return topics.filter((t) => String(t.subject_id) === String(selectedSubjectId));
  }, [topics, selectedSubjectId]);

  // Khởi tạo câu hỏi nếu là chế độ chỉnh sửa đề thi
  useEffect(() => {
    if (initialExam && initialExam.questions && initialExam.questions.length > 0) {
      const formatted = initialExam.questions.map((q, idx) => {
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
      setExamQuestions(formatted);
    }
  }, [initialExam]);

  // Tải danh sách câu hỏi ngân hàng khi môn học thay đổi hoặc mở tab chọn thủ công
  useEffect(() => {
    async function fetchBankQuestions() {
      if (!selectedSubjectId) return;
      setIsLoadingBankQuestions(true);
      try {
        const params = new URLSearchParams({ subject_id: selectedSubjectId });
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

    if (isOpen && selectedSubjectId) {
      fetchBankQuestions();
    }
  }, [isOpen, selectedSubjectId]);

  // Cập nhật topic mặc định cho form tạo câu hỏi mới
  useEffect(() => {
    if (availableTopics.length > 0 && !newQTopicId) {
      setNewQTopicId(availableTopics[0]._id);
    }
  }, [availableTopics, newQTopicId]);

  // Danh sách ID các câu hỏi đã có trong đề thi
  const selectedQuestionIds = useMemo(() => {
    return new Set(examQuestions.map((q) => q.question_id));
  }, [examQuestions]);

  // Danh sách câu hỏi hiển thị khi lọc thủ công
  const filteredBankQuestions = useMemo(() => {
    return bankQuestions.filter((q) => {
      if (manualFilterTopic !== "all") {
        const topicId = typeof q.topic_id === "object" ? q.topic_id?._id : q.topic_id;
        if (String(topicId) !== manualFilterTopic) return false;
      }
      if (manualFilterDifficulty !== "all" && q.difficulty_level !== manualFilterDifficulty) {
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
  }, [bankQuestions, manualFilterTopic, manualFilterDifficulty, manualSearchQuery]);

  // Thống kê số lượng câu hỏi hiện có trong chuyên đề đã chọn để bốc ngẫu nhiên
  const randomTopicStats = useMemo(() => {
    const relevant = bankQuestions.filter((q) => {
      if (selectedQuestionIds.has(q._id)) return false; // Không tính câu đã có trong đề
      if (randomTopicId !== "all") {
        const topicId = typeof q.topic_id === "object" ? q.topic_id?._id : q.topic_id;
        if (String(topicId) !== randomTopicId) return false;
      }
      return true;
    });

    return {
      easy: relevant.filter((q) => q.difficulty_level === "easy").length,
      medium: relevant.filter((q) => q.difficulty_level === "medium").length,
      hard: relevant.filter((q) => q.difficulty_level === "hard").length,
      total: relevant.length,
    };
  }, [bankQuestions, selectedQuestionIds, randomTopicId]);

  // ============================================================
  // HÀNH ĐỘNG 1: THÊM CÂU HỎI THỦ CÔNG
  // ============================================================
  function handleToggleManualQuestion(q: QuestionBankItem) {
    if (selectedQuestionIds.has(q._id)) {
      // Đã có thì xóa khỏi đề
      setExamQuestions((prev) => prev.filter((item) => item.question_id !== q._id));
    } else {
      // Chưa có thì thêm vào đề
      const newEntry: ExamQuestionEntry = {
        question_id: q._id,
        question_order: examQuestions.length + 1,
        question_score: 1,
        topic_name: typeof q.topic_id === "object" ? q.topic_id?.topic_name : "Chung",
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
      setExamQuestions((prev) => [...prev, newEntry]);
    }
  }

  function handleAddAllFiltered() {
    const toAdd: ExamQuestionEntry[] = [];
    filteredBankQuestions.forEach((q) => {
      if (!selectedQuestionIds.has(q._id)) {
        toAdd.push({
          question_id: q._id,
          question_order: examQuestions.length + toAdd.length + 1,
          question_score: 1,
          topic_name: typeof q.topic_id === "object" ? q.topic_id?.topic_name : "Chung",
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
        });
      }
    });

    if (toAdd.length > 0) {
      setExamQuestions((prev) => [...prev, ...toAdd]);
    }
  }

  // ============================================================
  // HÀNH ĐỘNG 2: BỐC NGẪU NHIÊN THEO MA TRẬN
  // ============================================================
  async function handleRandomPick() {
    setRandomPickMessage(null);
    const totalToPick = randomEasyCount + randomMediumCount + randomHardCount;
    if (totalToPick <= 0) {
      setRandomPickMessage({ text: "Vui lòng nhập số lượng câu hỏi cần bốc lớn hơn 0", type: "error" });
      return;
    }

    if (!selectedSubjectId) {
      setRandomPickMessage({ text: "Vui lòng chọn ngân hàng môn học", type: "error" });
      return;
    }

    setIsRandomPicking(true);
    try {
      const res = await fetch("/api/instructor/exams/random-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: selectedSubjectId,
          topic_id: randomTopicId !== "all" ? randomTopicId : undefined,
          easy_count: randomEasyCount,
          medium_count: randomMediumCount,
          hard_count: randomHardCount,
          exclude_ids: Array.from(selectedQuestionIds),
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        const newlyPicked: ExamQuestionEntry[] = data.questions.map((q: QuestionBankItem, idx: number) => ({
          question_id: q._id,
          question_order: examQuestions.length + idx + 1,
          question_score: 1,
          topic_name: typeof q.topic_id === "object" ? q.topic_id?.topic_name : "Chung",
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

        setExamQuestions((prev) => [...prev, ...newlyPicked]);
        setRandomPickMessage({
          text: `Đã bốc thành công ${newlyPicked.length} câu hỏi vào đề thi! (Dễ: ${data.actual_counts.easy}, Vừa: ${data.actual_counts.medium}, Khó: ${data.actual_counts.hard})`,
          type: "success",
        });

        // Reset bộ đếm bốc
        setRandomEasyCount(0);
        setRandomMediumCount(0);
        setRandomHardCount(0);
      } else {
        setRandomPickMessage({ text: data.message || "Không thể bốc câu hỏi", type: "error" });
      }
    } catch {
      setRandomPickMessage({ text: "Lỗi kết nối máy chủ khi bốc câu hỏi", type: "error" });
    } finally {
      setIsRandomPicking(false);
    }
  }

  // ============================================================
  // HÀNH ĐỘNG 3: SOẠN CÂU HỎI MỚI TRỰC TIẾP VÀO ĐỀ
  // ============================================================
  async function handleCreateDirectQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newQTopicId) {
      alert("Vui lòng chọn chuyên đề cho câu hỏi mới");
      return;
    }
    if (!newQContent.trim()) {
      alert("Nội dung câu hỏi không được để trống");
      return;
    }
    const hasCorrect = newQOptions.some((o) => o.is_correct);
    if (!hasCorrect) {
      alert("Vui lòng chọn ít nhất 1 đáp án đúng");
      return;
    }

    setIsCreatingNewQuestion(true);
    try {
      // Lưu câu hỏi vào ngân hàng câu hỏi trước để có ID chính thức
      const res = await fetch("/api/instructor/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: newQTopicId,
          content: newQContent.trim(),
          difficulty_level: newQDifficulty,
          explanation: newQExplanation.trim(),
          options: newQOptions,
        }),
      });

      const data = await res.json();
      if (data.success && data.question) {
        const savedQ = data.question;
        const topicObj = availableTopics.find((t) => t._id === newQTopicId);

        // Thêm ngay vào danh sách câu hỏi của đề thi
        const newEntry: ExamQuestionEntry = {
          question_id: savedQ._id,
          question_order: examQuestions.length + 1,
          question_score: 1,
          topic_name: topicObj ? topicObj.topic_name : "Chung",
          question_snapshot: {
            content: savedQ.content,
            difficulty_level: savedQ.difficulty_level,
            explanation: savedQ.explanation || "",
            options: savedQ.options,
          },
        };

        setExamQuestions((prev) => [...prev, newEntry]);
        setBankQuestions((prev) => [savedQ, ...prev]);

        // Reset form
        setNewQContent("");
        setNewQExplanation("");
        setNewQOptions([
          { option_label: "A", content: "", is_correct: true },
          { option_label: "B", content: "", is_correct: false },
          { option_label: "C", content: "", is_correct: false },
          { option_label: "D", content: "", is_correct: false },
        ]);

        alert("Đã tạo câu hỏi mới và thêm vào đề thi thành công!");
      } else {
        alert(data.message || "Lỗi khi tạo câu hỏi mới");
      }
    } catch {
      alert("Lỗi kết nối khi tạo câu hỏi mới");
    } finally {
      setIsCreatingNewQuestion(false);
    }
  }

  // ============================================================
  // HÀNH ĐỘNG 4: CHỈNH SỬA CÂU HỎI & ĐÁP ÁN TRONG ĐỀ
  // ============================================================
  function handleOpenEditQuestion(index: number) {
    const target = examQuestions[index];
    if (!target) return;
    setEditingIndex(index);
    setEditQContent(target.question_snapshot.content);
    setEditQDifficulty(target.question_snapshot.difficulty_level);
    setEditQExplanation(target.question_snapshot.explanation || "");
    setEditQOptions(
      JSON.parse(JSON.stringify(target.question_snapshot.options || [])),
    );
  }

  function handleSaveEditedQuestion() {
    if (editingIndex === null) return;
    if (!editQContent.trim()) {
      alert("Nội dung câu hỏi không được để trống");
      return;
    }
    const hasCorrect = editQOptions.some((o) => o.is_correct);
    if (!hasCorrect) {
      alert("Bắt buộc phải có ít nhất 1 đáp án đúng");
      return;
    }

    setExamQuestions((prev) => {
      const updated = [...prev];
      updated[editingIndex] = {
        ...updated[editingIndex],
        is_custom_edited: true,
        question_snapshot: {
          content: editQContent.trim(),
          difficulty_level: editQDifficulty,
          explanation: editQExplanation.trim(),
          options: editQOptions.map((opt) => ({
            ...opt,
            content: opt.content.trim(),
          })),
        },
      };
      return updated;
    });

    setEditingIndex(null);
  }

  // ============================================================
  // HÀNH ĐỘNG 5: ĐIỀU CHỈNH ĐIỂM & THỨ TỰ
  // ============================================================
  function handleDistributeScoresEvenly() {
    if (examQuestions.length === 0) return;
    const count = examQuestions.length;
    const baseScore = parseFloat((maxScore / count).toFixed(2));
    setExamQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        question_score: baseScore,
      })),
    );
  }

  function handleUpdateSingleScore(index: number, score: number) {
    setExamQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], question_score: Math.max(0, score) };
      return updated;
    });
  }

  function handleRemoveQuestionFromExam(index: number) {
    setExamQuestions((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Đánh số lại thứ tự
      return updated.map((q, idx) => ({ ...q, question_order: idx + 1 }));
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

  // ============================================================
  // HÀNH ĐỘNG 6: LƯU ĐỀ THI (BẢN NHÁP HOẶC XUẤT BẢN)
  // ============================================================
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
        questions: examQuestions.map((q, idx) => ({
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fade-in my-auto">
        {/* ========================================================================= */}
        {/* HEADER MODAL */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {initialExam ? "Chỉnh Sửa & Cập Nhật Đề Thi" : "Tạo Đề Thi & Cấu Hình Đề Thi Mới"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thiết lập ngân hàng môn, thời gian, câu hỏi thủ công, bốc ngẫu nhiên ma trận và chia điểm
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB NAVIGATION BAR */}
        {/* ========================================================================= */}
        <div className="px-6 pt-3 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("config")}
              className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "config"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span>⚙️</span>
              <span>1. Cấu Hình Đề Thi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("add_questions")}
              className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "add_questions"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span>➕</span>
              <span>2. Thêm Câu Hỏi Vào Đề</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Kho {bankQuestions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("review")}
              className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "review"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span>📝</span>
              <span>3. Câu Hỏi Đã Chọn & Sửa Đề</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                examQuestions.length > 0 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {examQuestions.length} câu
              </span>
            </button>
          </div>
        </div>

        {/* THÔNG BÁO LỖI NẾU CÓ */}
        {formError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <span>⚠️</span>
            <span>{formError}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BODY TỪNG TAB */}
        {/* ========================================================================= */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: CẤU HÌNH ĐỀ THI */}
          {activeTab === "config" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Tên đề thi & Ngân hàng môn học */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Tên Bài Thi / Tiêu Đề Đề Thi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Đề kiểm tra Giữa kỳ 1 - Khảo sát đồ thị hàm số..."
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Ngân Hàng Môn Học <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      if (examQuestions.length > 0) {
                        const confirmChange = window.confirm(
                          "Đổi ngân hàng môn học sẽ cần rà soát lại các câu hỏi đã chọn. Bạn có chắc muốn đổi không?",
                        );
                        if (!confirmChange) return;
                      }
                      setSelectedSubjectId(e.target.value);
                    }}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500"
                  >
                    {subjects.map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        {sub.subject_name} {sub.code ? `(${sub.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thời gian làm bài & Thang điểm */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Thời Gian Làm Bài (Phút) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                  />
                  <div className="flex gap-1.5 mt-2">
                    {[15, 45, 60, 90].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMinutes(mins)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          durationMinutes === mins
                            ? "bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400"
                            : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800"
                        }`}
                      >
                        {mins}p
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Thang Điểm Tối Đa
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    min={1}
                    value={maxScore}
                    onChange={(e) => setMaxScore(parseFloat(e.target.value) || 10)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Mặc định: thang 10 điểm</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Điểm Đạt Chuẩn (Pass)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    min={0}
                    max={maxScore}
                    value={passScore}
                    onChange={(e) => setPassScore(parseFloat(e.target.value) || 5)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 font-bold text-emerald-600 dark:text-emerald-400"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Mặc định: 5.0 điểm</span>
                </div>
              </div>

              {/* Các thiết lập xáo đề, đảo đáp án, xem kết quả */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>🛡️</span>
                  <span>Cấu Hình Đề Thi Thông Minh & Chống Gian Lận</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  {/* Switch 1: Xáo trộn câu hỏi */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Xáo Thứ Tự Câu Hỏi
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Mỗi thí sinh nhận đề với thứ tự câu hỏi ngẫu nhiên khác nhau
                      </span>
                    </div>
                  </label>

                  {/* Switch 2: Đảo đáp án */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Xáo Thứ Tự Đáp Án
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Đảo vị trí các phương án A, B, C, D chống nhìn bài nhau
                      </span>
                    </div>
                  </label>

                  {/* Switch 3: Xem đáp án sau nộp */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      checked={allowViewResult}
                      onChange={(e) => setAllowViewResult(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Xem Đáp Án Sau Nộp
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
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
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <span>Tiếp tục: Thêm câu hỏi vào đề</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: THÊM CÂU HỎI VÀO ĐỀ */}
          {activeTab === "add_questions" && (
            <div className="space-y-6">
              {/* Phân vùng chọn cách thêm câu hỏi */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Phương thức chọn:</span>
                  <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setAddMode("manual")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        addMode === "manual"
                          ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      🎯 Chọn Thủ Công ({filteredBankQuestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode("random")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        addMode === "random"
                          ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      ⚡ Bốc Ngẫu Nhiên Ma Trận
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode("create_new")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        addMode === "create_new"
                          ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      ✍️ Soạn Câu Mới
                    </button>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Đã đưa vào đề: <strong className="text-blue-600 dark:text-blue-400">{examQuestions.length}</strong> câu
                </div>
              </div>

              {/* PHƯƠNG THỨC 1: CHỌN THỦ CÔNG TỪ NGÂN HÀNG */}
              {addMode === "manual" && (
                <div className="space-y-4">
                  {/* Thanh lọc câu hỏi */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <select
                        value={manualFilterTopic}
                        onChange={(e) => setManualFilterTopic(e.target.value)}
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="all">Tất cả chuyên đề ({availableTopics.length})</option>
                        {availableTopics.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.topic_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <select
                        value={manualFilterDifficulty}
                        onChange={(e) => setManualFilterDifficulty(e.target.value)}
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="all">Mọi độ khó</option>
                        <option value="easy">🟢 Mức Dễ</option>
                        <option value="medium">🟡 Mức Trung bình</option>
                        <option value="hard">🔴 Mức Khó</option>
                      </select>
                    </div>

                    <div className="sm:col-span-5 flex gap-2">
                      <input
                        type="text"
                        value={manualSearchQuery}
                        onChange={(e) => setManualSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm nội dung câu hỏi..."
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleAddAllFiltered}
                        title="Thêm tất cả các câu đang hiển thị vào đề"
                        className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold text-xs shrink-0 hover:bg-blue-100 transition cursor-pointer"
                      >
                        + Chọn hết
                      </button>
                    </div>
                  </div>

                  {/* Danh sách câu hỏi ngân hàng */}
                  {isLoadingBankQuestions ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      Đang tải câu hỏi từ ngân hàng...
                    </div>
                  ) : filteredBankQuestions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 border border-dashed rounded-2xl">
                      Không tìm thấy câu hỏi phù hợp trong ngân hàng môn học này.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {filteredBankQuestions.map((q, idx) => {
                        const isAdded = selectedQuestionIds.has(q._id);
                        return (
                          <div
                            key={q._id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isAdded
                                ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800"
                                : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  {typeof q.topic_id === "object" ? q.topic_id?.topic_name : "Chuyên đề"}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    q.difficulty_level === "easy"
                                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                      : q.difficulty_level === "hard"
                                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                                        : "bg-amber-50 text-amber-600 border border-amber-200"
                                  }`}
                                >
                                  {q.difficulty_level === "easy"
                                    ? "Dễ"
                                    : q.difficulty_level === "hard"
                                      ? "Khó"
                                      : "Vừa"}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleManualQuestion(q)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                  isAdded
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <span>✓ Đã thêm</span>
                                  </>
                                ) : (
                                  <>
                                    <span>+ Thêm vào đề</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="text-xs font-medium text-slate-800 dark:text-slate-100 mb-3">
                              {q.content}
                            </div>

                            {/* 4 đáp án */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {q.options.map((opt, oIdx) => (
                                <div
                                  key={oIdx}
                                  className={`p-2 rounded-lg border flex items-center gap-2 ${
                                    opt.is_correct
                                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold"
                                      : "border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-400"
                                  }`}
                                >
                                  <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-slate-200 dark:bg-slate-700 shrink-0">
                                    {opt.option_label}
                                  </span>
                                  <span className="truncate">{opt.content}</span>
                                  {opt.is_correct && <span className="ml-auto text-emerald-600 text-[10px]">✓ Đúng</span>}
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
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl space-y-5 max-w-2xl mx-auto">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>⚡</span>
                      <span>Bốc Ngẫu Nhiên Câu Hỏi Theo Ma Trận Độ Khó</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hệ thống tự động chọn ngẫu nhiên các câu hỏi từ ngân hàng môn học và đưa vào đề thi mà không trùng lặp.
                    </p>
                  </div>

                  {randomPickMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs font-medium ${
                        randomPickMessage.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {randomPickMessage.text}
                    </div>
                  )}

                  {/* Chọn chuyên đề để bốc */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Chuyên Đề Nguồn
                    </label>
                    <select
                      value={randomTopicId}
                      onChange={(e) => setRandomTopicId(e.target.value)}
                      className="w-full text-xs py-2.5 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                    >
                      <option value="all">Toàn bộ chuyên đề của môn ({availableTopics.length} chuyên đề)</option>
                      {availableTopics.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.topic_name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Kho khả dụng chưa chọn: <strong>{randomTopicStats.total}</strong> câu (Dễ: {randomTopicStats.easy}, Vừa: {randomTopicStats.medium}, Khó: {randomTopicStats.hard})
                    </span>
                  </div>

                  {/* 3 ô nhập số lượng Dễ / Vừa / Khó */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">🟢 Mức Dễ</span>
                        <span className="text-[10px] text-slate-400">Kho có: {randomTopicStats.easy}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={randomTopicStats.easy}
                        value={randomEasyCount}
                        onChange={(e) => setRandomEasyCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full text-base font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center"
                      />
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">🟡 Mức Vừa</span>
                        <span className="text-[10px] text-slate-400">Kho có: {randomTopicStats.medium}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={randomTopicStats.medium}
                        value={randomMediumCount}
                        onChange={(e) => setRandomMediumCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full text-base font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center"
                      />
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">🔴 Mức Khó</span>
                        <span className="text-[10px] text-slate-400">Kho có: {randomTopicStats.hard}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={randomTopicStats.hard}
                        value={randomHardCount}
                        onChange={(e) => setRandomHardCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full text-base font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      Tổng số câu sẽ bốc: <strong>{randomEasyCount + randomMediumCount + randomHardCount}</strong> câu
                    </span>

                    <button
                      type="button"
                      disabled={isRandomPicking || randomEasyCount + randomMediumCount + randomHardCount === 0}
                      onClick={handleRandomPick}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {isRandomPicking ? "Đang bốc..." : "⚡ Bốc Ngẫu Nhiên Vào Đề"}
                    </button>
                  </div>
                </div>
              )}

              {/* PHƯƠNG THỨC 3: SOẠN CÂU HỎI MỚI TRỰC TIẾP */}
              {addMode === "create_new" && (
                <form onSubmit={handleCreateDirectQuestion} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl space-y-4 max-w-2xl mx-auto">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>✍️</span>
                      <span>Soạn Câu Hỏi Mới Trực Tiếp Vào Đề Thi</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Câu hỏi sẽ được lưu đồng thời vào Ngân hàng câu hỏi của môn và đưa trực tiếp vào đề thi này.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Chuyên Đề
                      </label>
                      <select
                        value={newQTopicId}
                        onChange={(e) => setNewQTopicId(e.target.value)}
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        {availableTopics.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.topic_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mức Độ
                      </label>
                      <select
                        value={newQDifficulty}
                        onChange={(e) => setNewQDifficulty(e.target.value as "easy" | "medium" | "hard")}
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="easy">🟢 Mức Dễ</option>
                        <option value="medium">🟡 Mức Trung bình</option>
                        <option value="hard">🔴 Mức Khó</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nội Dung Câu Hỏi <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={newQContent}
                      onChange={(e) => setNewQContent(e.target.value)}
                      placeholder="Nhập nội dung câu hỏi..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  {/* 4 đáp án */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      4 Phương Án Trả Lời (Đánh dấu phương án đúng)
                    </label>
                    {newQOptions.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {opt.option_label}
                        </span>
                        <input
                          type="text"
                          value={opt.content}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewQOptions((prev) => {
                              const updated = [...prev];
                              updated[oIdx] = { ...updated[oIdx], content: val };
                              return updated;
                            });
                          }}
                          placeholder={`Nội dung phương án ${opt.option_label}...`}
                          className="flex-1 text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setNewQOptions((prev) =>
                              prev.map((o, idx) => ({ ...o, is_correct: idx === oIdx })),
                            );
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                            opt.is_correct
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-200 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {opt.is_correct ? "✓ Đúng" : "Chọn"}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Lời Giải Thích Chi Tiết (Tùy chọn)
                    </label>
                    <textarea
                      rows={2}
                      value={newQExplanation}
                      onChange={(e) => setNewQExplanation(e.target.value)}
                      placeholder="Giải thích phương pháp giải câu này..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isCreatingNewQuestion}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
                    >
                      {isCreatingNewQuestion ? "Đang lưu..." : "Lưu & Thêm Vào Đề Thi"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: DANH SÁCH CÂU HỎI TRONG ĐỀ & CHỈNH SỬA TẠI CHỖ */}
          {activeTab === "review" && (
            <div className="space-y-4">
              {/* Thống kê & Nút chia đều điểm */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                    Cơ cấu câu hỏi đề thi ({currentExamStats.total} câu)
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <span>🟢 Dễ: <strong>{currentExamStats.easy}</strong></span>
                    <span>🟡 Vừa: <strong>{currentExamStats.medium}</strong></span>
                    <span>🔴 Khó: <strong>{currentExamStats.hard}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>Tổng điểm tích lũy: <strong className="text-blue-600 font-bold">{currentExamStats.totalScore} / {maxScore}</strong> điểm</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDistributeScoresEvenly}
                    title="Tự động chia đều điểm các câu theo thang điểm tối đa"
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold text-xs shadow-2xs hover:bg-blue-50 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>⚖️</span>
                    <span>Chia đều điểm (Thang {maxScore})</span>
                  </button>
                </div>
              </div>

              {examQuestions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 border border-dashed rounded-3xl">
                  <span className="text-3xl block mb-2">📭</span>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Chưa có câu hỏi nào trong đề thi</p>
                  <p className="text-xs text-slate-400 mt-1">Vui lòng chuyển sang Tab 2 để chọn thủ công hoặc bốc ngẫu nhiên câu hỏi.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {examQuestions.map((q, idx) => (
                    <div
                      key={`${q.question_id}-${idx}`}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 transition"
                    >
                      {/* Header hàng câu hỏi */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {q.topic_name || "Chuyên đề"}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              q.question_snapshot.difficulty_level === "easy"
                                ? "bg-emerald-50 text-emerald-600"
                                : q.question_snapshot.difficulty_level === "hard"
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            {q.question_snapshot.difficulty_level === "easy"
                              ? "Dễ"
                              : q.question_snapshot.difficulty_level === "hard"
                                ? "Khó"
                                : "Vừa"}
                          </span>
                          {q.is_custom_edited && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                              Đã sửa đề
                            </span>
                          )}
                        </div>

                        {/* Thao tác: chỉnh điểm, sửa câu, đổi thứ tự, xóa */}
                        <div className="flex items-center gap-2">
                          {/* Điểm của câu */}
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-400 font-medium">Điểm:</span>
                            <input
                              type="number"
                              step={0.1}
                              min={0}
                              value={q.question_score}
                              onChange={(e) => handleUpdateSingleScore(idx, parseFloat(e.target.value) || 0)}
                              className="w-14 text-xs font-bold text-center py-1 px-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                            />
                          </div>

                          {/* Đổi thứ tự lên / xuống */}
                          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveQuestion(idx, "up")}
                              className="px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              title="Chuyển lên"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === examQuestions.length - 1}
                              onClick={() => handleMoveQuestion(idx, "down")}
                              className="px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              title="Chuyển xuống"
                            >
                              ▼
                            </button>
                          </div>

                          {/* Nút Sửa câu hỏi & sửa đáp án */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditQuestion(idx)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
                          >
                            <span>✏️ Sửa</span>
                          </button>

                          {/* Nút Xóa khỏi đề */}
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionFromExam(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Xóa câu hỏi khỏi đề thi"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Nội dung câu hỏi */}
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-100 mb-2.5">
                        {q.question_snapshot.content}
                      </p>

                      {/* 4 đáp án */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                        {q.question_snapshot.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-1.5 px-2.5 rounded-lg border flex items-center gap-2 ${
                              opt.is_correct
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold"
                                : "border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            <span className="font-bold text-[10px] w-4">{opt.option_label}.</span>
                            <span className="truncate">{opt.content}</span>
                            {opt.is_correct && <span className="ml-auto text-emerald-600 text-[10px]">✓</span>}
                          </div>
                        ))}
                      </div>

                      {/* Lời giải thích nếu có */}
                      {q.question_snapshot.explanation && (
                        <div className="mt-2 text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                          💡 <strong>Lời giải:</strong> {q.question_snapshot.explanation}
                        </div>
                      )}
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
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Tổng cộng: <strong className="text-slate-800 dark:text-slate-200">{examQuestions.length} câu</strong> | Thang điểm: <strong>{currentExamStats.totalScore} / {maxScore}</strong> | Thời lượng: <strong>{durationMinutes} phút</strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveExam(false)}
              className="px-4 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/40 font-bold text-xs transition cursor-pointer"
            >
              {isSubmitting ? "Đang lưu..." : "💾 Lưu Bản Nháp"}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveExam(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition cursor-pointer"
            >
              {isSubmitting ? "Đang lưu..." : "🚀 Lưu & Xuất Bản Đề Thi"}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* POPUP SỬA CÂU HỎI & SỬA ĐÁP ÁN TRONG ĐỀ */}
        {/* ========================================================================= */}
        {editingIndex !== null && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>✏️</span>
                  <span>Sửa Câu Hỏi #{editingIndex + 1} Trong Đề Thi</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Độ Khó
                </label>
                <select
                  value={editQDifficulty}
                  onChange={(e) => setEditQDifficulty(e.target.value as "easy" | "medium" | "hard")}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="easy">🟢 Mức Dễ</option>
                  <option value="medium">🟡 Mức Trung bình</option>
                  <option value="hard">🔴 Mức Khó</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nội Dung Câu Hỏi
                </label>
                <textarea
                  rows={3}
                  value={editQContent}
                  onChange={(e) => setEditQContent(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  4 Phương Án Trả Lời (Đánh dấu phương án đúng)
                </label>
                {editQOptions.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {opt.option_label}
                    </span>
                    <input
                      type="text"
                      value={opt.content}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditQOptions((prev) => {
                          const updated = [...prev];
                          updated[oIdx] = { ...updated[oIdx], content: val };
                          return updated;
                        });
                      }}
                      className="flex-1 text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditQOptions((prev) =>
                          prev.map((o, idx) => ({ ...o, is_correct: idx === oIdx })),
                        );
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                        opt.is_correct
                          ? "bg-emerald-600 text-white"
                          : "border border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {opt.is_correct ? "✓ Đúng" : "Chọn"}
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lời Giải Thích Chi Tiết
                </label>
                <textarea
                  rows={2}
                  value={editQExplanation}
                  onChange={(e) => setEditQExplanation(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedQuestion}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  Lưu Sửa Đổi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
