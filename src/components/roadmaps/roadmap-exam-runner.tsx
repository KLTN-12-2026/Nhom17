"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ExamQuestion {
  _id: string;
  content: string;
  options: Array<{
    _id: string;
    option_label: string;
    content: string;
  }>;
}

interface ExamResult {
  score: number;
  total_correct: number;
  total_wrong: number;
  total_questions: number;
  passed: boolean;
  timed_out: boolean;
}

interface ExamSession {
  attempt_id: string;
  exam: {
    title: string;
    duration_minutes: number;
    pass_score: number;
  };
  questions: ExamQuestion[];
}

export default function RoadmapExamRunner({
  roadmapId,
  examId,
  onClose,
}: {
  roadmapId: string;
  examId: string;
  onClose: () => void;
}) {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const autoSubmitStarted = useRef(false);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/student/roadmaps/${roadmapId}/exams/${examId}/start`, {
      method: "POST",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Không thể bắt đầu đề thi.");
        }
        if (ignore) return;
        setSession({
          attempt_id: data.attempt_id,
          exam: data.exam,
          questions: data.questions || [],
        });
        setSecondsLeft(data.exam.duration_minutes * 60);
      })
      .catch((cause: unknown) => {
        if (!ignore) {
          setError(
            cause instanceof Error ? cause.message : "Không thể bắt đầu đề thi.",
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [examId, roadmapId]);

  const submitExam = useCallback(async () => {
    if (!session || submitting || result) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/student/roadmaps/${roadmapId}/exams/${examId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attempt_id: session.attempt_id,
            answers: session.questions.map((question) => ({
              question_id: question._id,
              selected_option_id:
                selectedAnswers[question._id] || null,
            })),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể nộp đề thi.");
      }
      setResult(data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể nộp đề thi.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [examId, roadmapId, result, selectedAnswers, session, submitting]);

  useEffect(() => {
    if (!session || result || secondsLeft === null || submitting) return;
    if (secondsLeft === 0) {
      if (!autoSubmitStarted.current) {
        autoSubmitStarted.current = true;
        void submitExam();
      }
      return;
    }
    const timer = window.setTimeout(
      () => setSecondsLeft((seconds) => (seconds === null ? null : seconds - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [result, secondsLeft, session, submitExam, submitting]);

  const currentQuestion = session?.questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const formattedTime =
    secondsLeft === null
      ? "--:--"
      : `${Math.floor(secondsLeft / 60)
          .toString()
          .padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="roadmap-exam-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
              Đề thi thử
            </p>
            <h2
              id="roadmap-exam-title"
              className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white"
            >
              {session?.exam.title || "Đang chuẩn bị đề thi"}
            </h2>
            {session && !result && (
              <p className="mt-1 text-xs text-slate-500">
                {answeredCount}/{session.questions.length} câu đã trả lời
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {!result && session && (
              <span
                className={`rounded-lg px-3 py-2 font-mono text-sm font-bold ${
                  secondsLeft !== null && secondsLeft <= 60
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
                aria-label="Thời gian còn lại"
              >
                {formattedTime}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng đề thi"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ×
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Đang chuẩn bị câu hỏi...
            </p>
          ) : error && !session ? (
            <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </p>
          ) : result ? (
            <div className="py-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                {result.timed_out ? "Đã hết giờ" : "Kết quả bài thi"}
              </p>
              <p className="mt-3 text-5xl font-black text-slate-900 dark:text-white">
                {result.score.toFixed(1)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {result.total_correct}/{result.total_questions} câu đúng
              </p>
              <p
                className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-bold ${
                  result.passed
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {result.passed ? "Đạt yêu cầu" : "Chưa đạt yêu cầu"}
              </p>
            </div>
          ) : currentQuestion && session ? (
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                {session.questions.map((question, index) => (
                  <button
                    key={question._id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`Câu ${index + 1}`}
                    className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-bold ${
                      currentIndex === index
                        ? "bg-indigo-600 text-white"
                        : selectedAnswers[question._id]
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Câu {currentIndex + 1} / {session.questions.length}
              </p>
              <h3 className="mt-2 whitespace-pre-line text-base font-semibold leading-7 text-slate-900 dark:text-white">
                {currentQuestion.content}
              </h3>
              <div className="mt-5 space-y-2.5">
                {currentQuestion.options.map((option) => {
                  const selected =
                    selectedAnswers[currentQuestion._id] === option._id;
                  return (
                    <button
                      key={option._id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setSelectedAnswers((answers) => ({
                          ...answers,
                          [currentQuestion._id]: option._id,
                        }))
                      }
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${
                        selected
                          ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-100"
                          : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-indigo-600 dark:bg-slate-900 dark:text-indigo-300">
                        {option.option_label}
                      </span>
                      <span className="whitespace-pre-line">{option.content}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">
              Đề thi chưa có câu hỏi.
            </p>
          )}
          {error && session && !result && (
            <p role="alert" className="mt-4 text-sm text-rose-600">
              {error}
            </p>
          )}
        </div>

        {session && !result && (
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Thoát
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((index) => index - 1)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                Câu trước
              </button>
              {currentIndex < session.questions.length - 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((index) => index + 1)}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Câu tiếp
                </button>
              )}
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitExam()}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            </div>
          </footer>
        )}
        {result && (
          <footer className="border-t border-slate-100 p-4 text-right dark:border-slate-800 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Đóng kết quả
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
