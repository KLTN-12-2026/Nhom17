"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AttemptDetail } from "@/lib/practice-history-detail";
import AiAttemptAnalysisCard from "@/components/student/ai-attempt-analysis-card";

type FilterMode = "all" | "wrong" | "unanswered" | "correct";

const DIFFICULTY_LABELS: Record<string, { text: string; className: string }> = {
  easy: {
    text: "Nhận biết",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60",
  },
  medium: {
    text: "Thông hiểu",
    className:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60",
  },
  hard: {
    text: "Vận dụng",
    className:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60",
  },
};

function formatDuration(seconds: number): string {
  const safeSecs = Math.max(0, Math.floor(seconds || 0));
  const mins = String(Math.floor(safeSecs / 60)).padStart(2, "0");
  const secs = String(safeSecs % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function PracticeResultDetailView({
  attempt,
}: {
  attempt: AttemptDetail;
}) {
  const router = useRouter();
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  const maxScore = attempt.max_score || 10;
  const totalQuestions = attempt.total_questions || attempt.answers.length || 0;
  const accuracy =
    totalQuestions > 0
      ? Math.round((attempt.total_correct / totalQuestions) * 100)
      : 0;
  const duration = formatDuration(attempt.duration_seconds);
  const isOfficial = attempt.attempt_type === "official";

  const correctCount = attempt.can_view_details
    ? attempt.answers.filter((a) => a.is_correct).length
    : attempt.total_correct;
  const unansweredCount = attempt.can_view_details
    ? attempt.answers.filter(
        (a) => !a.is_correct && a.selected_option_id === null
      ).length
    : 0;
  const wrongSelectedCount = attempt.can_view_details
    ? attempt.answers.filter(
        (a) => !a.is_correct && a.selected_option_id !== null
      ).length
    : attempt.total_wrong;

  const filteredAnswers = attempt.answers.filter((answer) => {
    if (filterMode === "correct") return answer.is_correct;
    if (filterMode === "wrong") {
      return !answer.is_correct && answer.selected_option_id !== null;
    }
    if (filterMode === "unanswered") {
      return !answer.is_correct && answer.selected_option_id === null;
    }
    return true;
  });

  const handlePracticeAgain = async () => {
    if (!attempt.topic_id || retrying) return;
    setRetrying(true);
    setRetryError("");

    try {
      const res = await fetch("/api/student/practice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: attempt.topic_id,
          question_count: Math.min(20, Math.max(5, totalQuestions || 10)),
          difficulty: "all",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.attempt_id) {
        setRetryError(
          data.message || "Không thể khởi tạo phiên luyện tập mới."
        );
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `practice_session_${data.attempt_id}`,
          JSON.stringify(data)
        );
      }
      router.push(`/student/practice/session/${data.attempt_id}`);
    } catch {
      setRetryError("Lỗi kết nối máy chủ khi tạo phiên luyện tập.");
    } finally {
      setRetrying(false);
    }
  };

  const formattedSubmitDate = new Date(attempt.submit_time).toLocaleString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isOfficial
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
              }`}
            >
              {isOfficial
                ? `🟢 Phòng thi trực tuyến${attempt.room_code ? `: ${attempt.room_code}` : ""}`
                : "📘 Tự luyện theo chuyên đề"}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {attempt.subject_name} · {attempt.topic_name}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            Kết quả và đáp án chi tiết
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Hoàn thành lúc {formattedSubmitDate}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {attempt.topic_id && !isOfficial && (
            <button
              type="button"
              onClick={handlePracticeAgain}
              disabled={retrying}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
            >
              <span>{retrying ? "Đang tạo đề..." : "Luyện lại dạng bài này ↺"}</span>
            </button>
          )}
          <Link
            href="/student/practice"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Chọn chuyên đề khác →
          </Link>
        </div>
      </header>

      {retryError && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {retryError}
        </div>
      )}

      {/* Hero Summary Card */}
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-700 p-6 text-white shadow-lg sm:p-8">
        <p className="text-sm font-bold text-indigo-100">
          {attempt.practice_title}
        </p>
        <div className="mt-2 text-4xl font-black">
          {attempt.score} <span className="text-2xl font-bold text-indigo-200">/ {maxScore}</span>
        </div>
        <p className="mt-2 text-sm text-indigo-100">
          Thời gian làm bài: <strong>{duration}</strong>
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Tổng số câu" value={totalQuestions} />
          <Stat label="Trả lời đúng" value={correctCount} />
          <Stat label="Trả lời sai" value={wrongSelectedCount} />
          <Stat
            label="Chưa trả lời"
            value={attempt.can_view_details ? unansweredCount : "—"}
          />
          <Stat label="Độ chính xác" value={`${accuracy}%`} />
        </div>
      </section>

      {/* Trợ lý AI Phân Tích Lỗ Hổng Kiến Thức (Chỉ hiện khi được phép xem chi tiết và đủ >= 3 câu) */}
      {attempt.can_view_details && totalQuestions >= 3 && (
        <AiAttemptAnalysisCard attemptId={attempt._id} />
      )}

      {/* Details Section */}
      {!attempt.can_view_details ? (
        <section className="rounded-3xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/30 p-8 text-center space-y-2">
          <p className="text-base font-bold text-amber-800 dark:text-amber-300">
            {attempt.waiting_room_finish
              ? "Phòng thi vẫn đang diễn ra"
              : "Không được phép xem đáp án chi tiết"}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-200/80 max-w-lg mx-auto leading-relaxed">
            {attempt.waiting_room_finish
              ? "Đáp án chi tiết và lời giải sẽ tự động mở khóa sau khi Giảng viên kết thúc ca thi hoặc hết giờ làm bài của phòng thi để chống lộ đề."
              : "Giảng viên đã cấu hình không hiển thị đáp án chi tiết cho đề thi này."}
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Chi tiết từng câu ({filteredAnswers.length}/{attempt.answers.length})
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Đáp án đúng hiển thị màu xanh lá, lựa chọn sai của bạn hiển thị màu đỏ.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={filterMode === "all"}
                onClick={() => setFilterMode("all")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  filterMode === "all"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                Tất cả ({attempt.answers.length})
              </button>
              <button
                type="button"
                aria-pressed={filterMode === "wrong"}
                onClick={() => setFilterMode("wrong")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  filterMode === "wrong"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "border border-rose-200 dark:border-rose-800/70 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50"
                }`}
              >
                Câu sai ({wrongSelectedCount})
              </button>
              <button
                type="button"
                aria-pressed={filterMode === "unanswered"}
                onClick={() => setFilterMode("unanswered")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  filterMode === "unanswered"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                }`}
              >
                Bỏ trống ({unansweredCount})
              </button>
              <button
                type="button"
                aria-pressed={filterMode === "correct"}
                onClick={() => setFilterMode("correct")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  filterMode === "correct"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
                }`}
              >
                Câu đúng ({correctCount})
              </button>
            </div>
          </div>

          {filteredAnswers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
              Không có câu hỏi nào thuộc bộ lọc này.
            </div>
          ) : (
            filteredAnswers.map((answer) => {
              const isUnanswered =
                !answer.is_correct && answer.selected_option_id === null;
              const correctOption = answer.options.find(
                (option) => option.is_correct
              );
              const selectedOption = answer.options.find(
                (option) => option._id === answer.selected_option_id
              );
              const diffBadge =
                DIFFICULTY_LABELS[answer.difficulty_level] ||
                DIFFICULTY_LABELS.medium;

              const cardStyle = answer.is_correct
                ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/70 dark:bg-emerald-950/20"
                : isUnanswered
                  ? "border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/60"
                  : "border-rose-200 bg-rose-50/40 dark:border-rose-900/70 dark:bg-rose-950/20";

              return (
                <article
                  key={`${answer.question_id}-${answer.index}`}
                  className={`rounded-2xl border-2 p-5 sm:p-6 ${cardStyle}`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-800 dark:text-white">
                        Câu {answer.index}
                      </h3>
                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-[11px] font-semibold ${diffBadge.className}`}
                      >
                        {diffBadge.text}
                      </span>
                    </div>

                    {answer.is_correct ? (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                        ✓ Trả lời đúng
                      </span>
                    ) : isUnanswered ? (
                      <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                        ⚪ Chưa trả lời / Bỏ trống
                      </span>
                    ) : (
                      <span className="rounded-full bg-rose-100 dark:bg-rose-900/60 px-3 py-1 text-xs font-bold text-rose-800 dark:text-rose-200">
                        ✗ Trả lời sai
                      </span>
                    )}
                  </div>

                  <p className="mt-3 whitespace-pre-line font-medium leading-relaxed text-slate-900 dark:text-white">
                    {answer.content}
                  </p>

                  <div className="mt-4 space-y-2">
                    {answer.options.map((option) => {
                      const selected = option._id === answer.selected_option_id;
                      const style = option.is_correct
                        ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100"
                        : selected
                          ? "border-rose-500 bg-rose-50 text-rose-950 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-100"
                          : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

                      return (
                        <div
                          key={option._id}
                          className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${style}`}
                        >
                          <strong>{option.option_label}.</strong>
                          <span className="flex-1">{option.content}</span>
                          {option.is_correct && selected && (
                            <strong className="text-xs text-emerald-700 dark:text-emerald-300 shrink-0">
                              ✓ Đáp án đúng &amp; Bạn đã chọn
                            </strong>
                          )}
                          {option.is_correct && !selected && (
                            <strong className="text-xs text-emerald-700 dark:text-emerald-300 shrink-0">
                              ✓ Đáp án đúng
                            </strong>
                          )}
                          {selected && !option.is_correct && (
                            <strong className="text-xs text-rose-700 dark:text-rose-300 shrink-0">
                              ✗ Bạn đã chọn
                            </strong>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                    Bạn chọn:{" "}
                    <strong>
                      {selectedOption
                        ? `${selectedOption.option_label}. ${selectedOption.content}`
                        : "Chưa chọn (Bỏ trống)"}
                    </strong>
                    {correctOption && (
                      <>
                        {" "}
                        · Đáp án đúng:{" "}
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          {correctOption.option_label}. {correctOption.content}
                        </strong>
                      </>
                    )}
                  </p>

                  <div className="mt-4 rounded-xl border border-indigo-100 dark:border-indigo-900/70 bg-white dark:bg-slate-900 p-4">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      💡 Giải thích &amp; Phương pháp giải
                    </h4>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {answer.explanation?.trim() ||
                        (correctOption
                          ? `Đáp án đúng là ${correctOption.option_label}. (Chưa có lời giải chi tiết bổ sung).`
                          : "Chưa có lời giải.")}
                    </p>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-xs">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs text-indigo-100">{label}</div>
    </div>
  );
}
