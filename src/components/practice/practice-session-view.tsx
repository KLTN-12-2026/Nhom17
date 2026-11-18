"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PracticeOption {
  _id: string;
  option_label: string;
  content: string;
  is_correct: boolean;
}

interface PracticeQuestion {
  _id: string;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation?: string;
  options: PracticeOption[];
  selected_option_id?: string | null;
}

interface PracticeTopic {
  _id: string | null;
  topic_name: string;
  level: number;
}

interface PracticeSessionViewProps {
  attemptId: string;
}

export default function PracticeSessionView({
  attemptId,
}: PracticeSessionViewProps) {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  const [topic, setTopic] = useState<PracticeTopic | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Map: question_id -> selected_option_id
  const [selectedAnswers, setSelectedAnswers] = useState<Map<string, string>>(
    new Map()
  );

  // Set các câu hỏi đã bấm "Kiểm tra đáp án" để xem giải thích tức thì
  const [checkedQuestionIds, setCheckedQuestionIds] = useState<Set<string>>(
    new Set()
  );

  // Đồng hồ đếm xuôi (thời gian làm bài tính bằng giây)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Trạng thái nộp bài
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [resultSummary, setResultSummary] = useState<{
    score: number;
    total_correct: number;
    total_wrong: number;
    total_questions: number;
    duration_seconds: number;
  } | null>(null);

  // Bộ lọc sau khi nộp bài
  const [filterWrongOnly, setFilterWrongOnly] = useState<boolean>(false);

  // Tải dữ liệu phiên tự luyện (ưu tiên từ sessionStorage, fallback sang API)
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        setLoading(true);

        // 1. Kiểm tra cache sessionStorage trước
        if (typeof window !== "undefined") {
          const cached = sessionStorage.getItem(`practice_session_${attemptId}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.questions && parsed.questions.length > 0) {
                if (isMounted) {
                  setTopic(parsed.topic || null);
                  setQuestions(parsed.questions || []);
                  setLoading(false);
                  return;
                }
              }
            } catch {
              // Parse lỗi thì bỏ qua fallback sang API
            }
          }
        }

        // 2. Fetch từ API nếu không có trong cache
        const res = await fetch(`/api/student/practice/session/${attemptId}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok || !data.success) {
          setLoadError(data.message || "Không thể tải dữ liệu phiên tự luyện.");
          setLoading(false);
          return;
        }

        setTopic(data.topic || null);
        setQuestions(data.questions || []);

        // Phục hồi câu trả lời cũ nếu có
        const initialAnswers = new Map<string, string>();
        for (const q of data.questions) {
          if (q.selected_option_id) {
            initialAnswers.set(q._id, q.selected_option_id);
          }
        }
        setSelectedAnswers(initialAnswers);

        // Nếu đã nộp trước đó
        if (data.status === "submitted") {
          setIsSubmitted(true);
          setResultSummary({
            score: data.score,
            total_correct: data.total_correct,
            total_wrong: data.total_wrong,
            total_questions: data.total_questions,
            duration_seconds: data.duration_seconds,
          });
          // Tự động đánh dấu kiểm tra tất cả câu hỏi
          setCheckedQuestionIds(
            new Set((data.questions as PracticeQuestion[]).map((q) => q._id))
          );
        }

        setLoading(false);
      } catch (err) {
        console.error("Lỗi khởi tạo phiên:", err);
        if (isMounted) {
          setLoadError("Có lỗi kết nối máy chủ khi tải câu hỏi.");
          setLoading(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [attemptId]);

  // Đồng hồ đếm xuôi (dừng lại khi đã nộp bài)
  useEffect(() => {
    if (loading || isSubmitted) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, isSubmitted]);

  // Định dạng thời gian mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Chọn phương án
  const handleSelectOption = (questionId: string, optionId: string) => {
    if (isSubmitted) return; // Đã nộp bài thì không sửa
    setSelectedAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionId, optionId);
      return next;
    });
  };

  // Bấm "Kiểm tra đáp án" câu hiện tại (Instant Feedback)
  const handleCheckAnswer = (questionId: string) => {
    setCheckedQuestionIds((prev) => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
  };

  // Nộp bài tự luyện
  const handleSubmitPractice = useCallback(async () => {
    try {
      setSubmitting(true);
      setShowSubmitConfirm(false);

      const answersPayload = questions.map((q) => ({
        question_id: q._id,
        selected_option_id: selectedAnswers.get(q._id) || null,
      }));

      const res = await fetch("/api/student/practice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: attemptId,
          duration_seconds: elapsedSeconds,
          answers: answersPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Không thể nộp bài. Vui lòng thử lại!");
        setSubmitting(false);
        return;
      }

      setIsSubmitted(true);
      setResultSummary({
        score: data.score,
        total_correct: data.total_correct,
        total_wrong: data.total_wrong,
        total_questions: data.total_questions,
        duration_seconds: data.duration_seconds,
      });

      // Mở bung kiểm tra đáp án cho toàn bộ câu hỏi
      setCheckedQuestionIds(new Set(questions.map((q) => q._id)));
      setSubmitting(false);
    } catch (err) {
      console.error("Lỗi khi nộp bài:", err);
      alert("Lỗi kết nối máy chủ. Vui lòng thử lại!");
      setSubmitting(false);
    }
  }, [attemptId, elapsedSeconds, questions, selectedAnswers]);

  // Danh sách câu hỏi hiển thị (hỗ trợ lọc câu sai sau khi nộp)
  const displayedQuestionIndices = useMemo(() => {
    if (!isSubmitted || !filterWrongOnly) {
      return questions.map((_, i) => i);
    }

    return questions
      .map((q, i) => {
        const selectedId = selectedAnswers.get(q._id);
        const correctOpt = q.options.find((o) => o.is_correct);
        const isCorrect = selectedId && correctOpt && selectedId === correctOpt._id;
        return isCorrect ? -1 : i;
      })
      .filter((i) => i !== -1);
  }, [isSubmitted, filterWrongOnly, questions, selectedAnswers]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = selectedAnswers.size;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800 dark:text-white">
          Đang chuẩn bị đề tự luyện...
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Hệ thống đang trích xuất câu hỏi từ ngân hàng câu hỏi chuẩn kiến thức
        </p>
      </div>
    );
  }

  if (loadError || !currentQuestion) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 text-2xl font-bold">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
          {loadError || "Không tìm thấy câu hỏi nào trong phiên làm bài này."}
        </h2>
        <p className="text-xs text-slate-500 max-w-md mb-6">
          Vui lòng quay lại danh mục chuyên đề để bắt đầu lại một phiên luyện tập khác.
        </p>
        <Link
          href="/student/practice"
          className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-indigo-700 transition"
        >
          ← Quay lại danh mục chuyên đề
        </Link>
      </div>
    );
  }

  const currentSelectedOptionId = selectedAnswers.get(currentQuestion._id);
  const isCurrentChecked = checkedQuestionIds.has(currentQuestion._id);
  const currentCorrectOption = currentQuestion.options.find((o) => o.is_correct);
  const isCurrentCorrect =
    currentSelectedOptionId &&
    currentCorrectOption &&
    currentSelectedOptionId === currentCorrectOption._id;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Bar: Tiêu đề, Đồng hồ đếm xuôi & Tiến độ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs sticky top-4 z-20 backdrop-blur-md bg-white/95 dark:bg-slate-900/95">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                if (
                  !isSubmitted &&
                  answeredCount > 0 &&
                  !confirm("Bạn có chắc muốn rời khỏi bài luyện tập này? Tiến trình chưa nộp sẽ bị mất.")
                ) {
                  return;
                }
                router.push("/student/practice");
              }}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition shrink-0 cursor-pointer"
              title="Quay về danh mục"
            >
              ←
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                  Chế độ tự luyện không áp lực
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  {topic?.topic_name || "Tự luyện theo dạng bài"}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate mt-0.5">
                Câu {currentIndex + 1} / {totalQuestions}
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            {/* Đồng hồ đếm xuôi */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <svg className="w-4 h-4 text-indigo-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-white">
                {formatTime(isSubmitted && resultSummary ? resultSummary.duration_seconds : elapsedSeconds)}
              </div>
            </div>

            {/* Nút nộp bài */}
            {!isSubmitted ? (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Nộp Bài Tự Luyện</span>
                <span>✓</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                  Điểm: {resultSummary?.score} / 10
                </span>
                <Link
                  href="/student/practice"
                  className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 transition"
                >
                  Xong
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Thanh tiến độ làm bài */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
          <div
            className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* 2. Banner Kết Quả Sau Khi Nộp Bài */}
      {isSubmitted && resultSummary && (
        <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white mb-2">
                <span>🎉</span>
                <span>Hoàn thành bài tự luyện</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black">
                Điểm số: {resultSummary.score} / 10.0
              </h2>
              <p className="mt-1 text-xs text-emerald-100">
                Làm đúng: <strong>{resultSummary.total_correct}/{resultSummary.total_questions}</strong> câu •
                Thời gian làm: <strong>{formatTime(resultSummary.duration_seconds)}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setFilterWrongOnly(!filterWrongOnly)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterWrongOnly
                    ? "bg-amber-400 text-slate-900 shadow-md"
                    : "bg-white/20 hover:bg-white/30 text-white"
                }`}
              >
                {filterWrongOnly ? "Đang hiện: Chỉ câu sai" : "Lọc xem câu làm sai"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/student/practice")}
                className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-xs shadow-md hover:bg-emerald-50 transition cursor-pointer"
              >
                Luyện dạng bài khác →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bố Cục Chính 2 Cột: Nội Dung Câu Hỏi (Trái) & Bảng Điều Hướng (Phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI: Câu Hỏi & Các Lựa Chọn */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs">
            {/* Header câu hỏi */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs">
                  Câu {currentIndex + 1}
                </span>

                {/* Badge độ khó */}
                {currentQuestion.difficulty_level === "easy" && (
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    Nhận biết
                  </span>
                )}
                {currentQuestion.difficulty_level === "medium" && (
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    Thông hiểu
                  </span>
                )}
                {currentQuestion.difficulty_level === "hard" && (
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                    Vận dụng cao
                  </span>
                )}
              </div>

              {/* Trạng thái câu này nếu đã kiểm tra */}
              {isCurrentChecked && (
                <div>
                  {isCurrentCorrect ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span>✓</span>
                      <span>Chính xác</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      <span>✗</span>
                      <span>Chưa chính xác</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Nội dung câu hỏi */}
            <div className="text-slate-900 dark:text-white font-medium text-sm sm:text-base leading-relaxed mb-6 whitespace-pre-line">
              {currentQuestion.content}
            </div>

            {/* 4 Phương án A, B, C, D */}
            <div className="space-y-3">
              {currentQuestion.options.map((opt) => {
                const isSelected = currentSelectedOptionId === opt._id;
                const isCorrectOption = opt.is_correct;

                let cardStyle =
                  "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700";
                let badgeStyle =
                  "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";

                if (isCurrentChecked) {
                  if (isCorrectOption) {
                    // Đáp án đúng luôn tô xanh khi đã kiểm tra
                    cardStyle =
                      "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-xs";
                    badgeStyle = "bg-emerald-500 text-white font-black";
                  } else if (isSelected && !isCorrectOption) {
                    // Đáp án học sinh chọn sai tô đỏ
                    cardStyle =
                      "border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100";
                    badgeStyle = "bg-rose-500 text-white font-black";
                  }
                } else if (isSelected) {
                  // Đang chọn bình thường
                  cardStyle =
                    "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-100 shadow-sm";
                  badgeStyle = "bg-indigo-600 text-white font-black";
                }

                return (
                  <div
                    key={opt._id}
                    onClick={() => handleSelectOption(currentQuestion._id, opt._id)}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition cursor-pointer ${cardStyle}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition ${badgeStyle}`}
                    >
                      {opt.option_label}
                    </div>

                    <div className="flex-1 text-xs sm:text-sm pt-0.5 leading-snug">
                      {opt.content}
                    </div>

                    {isCurrentChecked && isCorrectOption && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 self-center">
                        ✓ Đáp án đúng
                      </span>
                    )}
                    {isCurrentChecked && isSelected && !isCorrectOption && (
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0 self-center">
                        ✗ Lựa chọn của bạn
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Nút hành động của câu hỏi */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Nút Kiểm Tra Đáp Án Ngay (Instant Feedback) */}
                {!isCurrentChecked ? (
                  <button
                    onClick={() => handleCheckAnswer(currentQuestion._id)}
                    disabled={!currentSelectedOptionId}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-900 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                    title={
                      !currentSelectedOptionId
                        ? "Vui lòng chọn 1 phương án trước khi kiểm tra"
                        : "Xem ngay đáp án & lời giải chi tiết"
                    }
                  >
                    <span>💡</span>
                    <span>Kiểm Tra Đáp Án Ngay</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <span>Đã kiểm tra</span>
                  </span>
                )}
              </div>

              {/* Điều hướng Câu trước / Câu sau */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer"
                >
                  ← Câu trước
                </button>
                <button
                  onClick={() =>
                    setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
                  }
                  disabled={currentIndex === totalQuestions - 1}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 disabled:opacity-30 transition cursor-pointer"
                >
                  Câu tiếp theo →
                </button>
              </div>
            </div>
          </div>

          {/* Hộp Lời Giải Chi Tiết & Bẫy Nhận Thức (Tự động mở khi bấm kiểm tra hoặc sau khi nộp) */}
          {isCurrentChecked && (
            <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded-3xl p-6 shadow-xs animate-in fade-in duration-300 space-y-3">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center font-bold text-sm">
                  📚
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Phương Pháp Giải &amp; Bẫy Nhận Thức
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Phân tích chi tiết từ giáo viên và gợi ý tư duy nhanh
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line border border-indigo-100 dark:border-indigo-900/60 font-mono">
                {currentQuestion.explanation?.trim() ? (
                  currentQuestion.explanation
                ) : (
                  <span className="italic text-slate-400 font-sans">
                    Đáp án đúng là: <strong>{currentCorrectOption?.option_label}</strong>. (Nội dung phương pháp giải đang được thầy cô hoàn thiện).
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: Bảng Điều Hướng Câu Hỏi (Question Palette) & Tóm Tắt */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs sticky top-32">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Bảng Câu Hỏi ({answeredCount}/{totalQuestions})
            </h3>

            {/* Grid các câu hỏi */}
            <div className="grid grid-cols-5 gap-2 mb-5">
              {questions.map((q, idx) => {
                if (isSubmitted && filterWrongOnly && !displayedQuestionIndices.includes(idx)) {
                  return null;
                }
                const isSelected = selectedAnswers.has(q._id);
                const isChecked = checkedQuestionIds.has(q._id);
                const isCurrent = idx === currentIndex;
                const correctOpt = q.options.find((o) => o.is_correct);
                const isCorrect =
                  isSelected && correctOpt && selectedAnswers.get(q._id) === correctOpt._id;

                let btnStyle =
                  "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200";

                if (isChecked) {
                  btnStyle = isCorrect
                    ? "bg-emerald-500 text-white font-bold"
                    : "bg-rose-500 text-white font-bold";
                } else if (isSelected) {
                  btnStyle = "bg-indigo-600 text-white font-bold";
                }

                if (isCurrent) {
                  btnStyle += " ring-2 ring-offset-2 ring-indigo-500";
                }

                return (
                  <button
                    key={q._id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${btnStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Chú thích màu sắc */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-slate-200 dark:bg-slate-700 shrink-0" />
                <span>Chưa chọn đáp án</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-indigo-600 shrink-0" />
                <span>Đã chọn (chưa kiểm tra)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
                <span>Đã kiểm tra đúng (✓)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-rose-500 shrink-0" />
                <span>Đã kiểm tra sai (✗)</span>
              </div>
            </div>

            {/* Nút Nộp Bài dưới bảng câu hỏi */}
            {!isSubmitted && (
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
                >
                  Nộp Bài &amp; Xem Báo Cáo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Modal Xác Nhận Nộp Bài */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">
              📝
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Xác nhận nộp bài tự luyện?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Bạn đã làm <strong>{answeredCount}/{totalQuestions}</strong> câu hỏi.
                {answeredCount < totalQuestions && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold block mt-1">
                    Lưu ý: Bạn còn {totalQuestions - answeredCount} câu chưa chọn đáp án!
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Làm tiếp
              </button>
              <button
                type="button"
                onClick={handleSubmitPractice}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
              >
                {submitting ? "Đang chấm điểm..." : "Đồng ý nộp bài"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
