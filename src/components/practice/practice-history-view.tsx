"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AiAttemptAnalysisCard from "@/components/student/ai-attempt-analysis-card";

interface HistoryItem {
  _id: string;
  practice_title: string;
  subject_name: string;
  topic_name: string;
  topic_id: string | null;
  score: number;
  total_correct: number;
  total_wrong: number;
  total_questions: number;
  duration_seconds: number;
  submit_time: string;
  created_at: string;
}

interface HistoryStats {
  total_attempts: number;
  average_score: number;
  total_questions_practiced: number;
  total_correct_practiced: number;
  accuracy_rate: number;
}

interface DetailedAnswer {
  index: number;
  question_id: string;
  content: string;
  difficulty_level: string;
  explanation: string;
  options: Array<{
    _id: string;
    option_label: string;
    content: string;
    is_correct: boolean;
  }>;
  selected_option_id: string | null;
  is_correct: boolean;
}

interface AttemptDetail {
  _id: string;
  practice_title: string;
  subject_name: string;
  topic_name: string;
  score: number;
  total_correct: number;
  total_wrong: number;
  total_questions: number;
  duration_seconds: number;
  submit_time: string;
  answers: DetailedAnswer[];
}

export default function PracticeHistoryView() {
  const router = useRouter();

  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal xem lại chi tiết bài làm cũ
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [filterQuestionType, setFilterQuestionType] = useState<"all" | "correct" | "wrong">("all");

  // Tải danh sách lịch sử khi mount
  useEffect(() => {
    let isCancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch("/api/student/practice/history");
        const data = await res.json();
        if (!isCancelled && data.success) {
          setHistoryList(data.history || []);
          setStats(data.stats || null);

          // Tự động mở modal xem lại chi tiết nếu trên URL có ?review=... hoặc ?attemptId=...
          if (typeof window !== "undefined") {
            const searchParams = new URLSearchParams(window.location.search);
            const reviewId = searchParams.get("review") || searchParams.get("attemptId");
            if (reviewId) {
              setSelectedAttemptId(reviewId);
              setLoadingDetail(true);
              setFilterQuestionType("all");
              fetch(`/api/student/practice/history/${reviewId}`)
                .then((r) => r.json())
                .then((d) => {
                  if (!isCancelled && d.success && d.attempt) {
                    setAttemptDetail(d.attempt);
                  }
                })
                .catch((e) => console.error("Lỗi khi tự động tải chi tiết bài làm:", e))
                .finally(() => {
                  if (!isCancelled) setLoadingDetail(false);
                });
            }
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải lịch sử:", err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Mở modal xem chi tiết bài làm
  const handleOpenDetail = async (attemptId: string) => {
    try {
      setSelectedAttemptId(attemptId);
      setLoadingDetail(true);
      setFilterQuestionType("all");

      const res = await fetch(`/api/student/practice/history/${attemptId}`);
      const data = await res.json();
      if (data.success && data.attempt) {
        setAttemptDetail(data.attempt);
      }
    } catch (err) {
      console.error("Lỗi xem chi tiết bài làm:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Khởi tạo luyện lại dạng bài này
  const handlePracticeAgain = async (topicId: string | null) => {
    if (!topicId) return;
    try {
      const res = await fetch("/api/student/practice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: topicId,
          question_count: 10,
          difficulty: "all",
        }),
      });

      const data = await res.json();
      if (data.success && data.attempt_id) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`practice_session_${data.attempt_id}`, JSON.stringify(data));
        }
        router.push(`/student/practice/session/${data.attempt_id}`);
      }
    } catch (err) {
      console.error("Lỗi luyện lại:", err);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Banner & Nút Điều Hướng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/student/practice"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← Quay về danh mục ôn tập
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Nhật Ký Tiến Độ Tự Luyện
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi sự tiến bộ, điểm số qua từng lượt và ôn lại các câu hỏi đã làm sai
          </p>
        </div>

        <Link
          href="/student/practice"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition self-start sm:self-auto cursor-pointer"
        >
          <span>+ Luyện Dạng Bài Mới</span>
        </Link>
      </div>

      {/* 2. Thống Kê Tổng Quan */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Lượt Đã Tự Luyện
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.total_attempts} <span className="text-xs font-normal text-slate-400">lượt</span>
            </div>
            <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              Tự giác củng cố kiến thức
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Điểm Trung Bình
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.average_score} <span className="text-xs font-normal text-slate-400">/ 10</span>
            </div>
            <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              {stats.average_score >= 8 ? "Thành thạo dạng bài" : "Đang tiến bộ đều đặn"}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tổng Câu Hỏi Đã Luyện
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.total_questions_practiced} <span className="text-xs font-normal text-slate-400">câu</span>
            </div>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
              {stats.total_correct_practiced} câu trả lời đúng
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tỷ Lệ Chính Xác
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.accuracy_rate}%
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Tích lũy từ tất cả dạng bài
            </div>
          </div>
        </div>
      )}

      {/* 3. Danh Sách Lịch Sử Ôn Tập */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
          Chi Tiết Các Lượt Làm Bài Gần Đây
        </h2>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-500">Đang tải lịch sử ôn tập...</p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
              📚
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
              Chưa có lượt tự luyện nào
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
              Bạn chưa hoàn thành bài tự luyện nào. Hãy bắt đầu chọn một dạng bài để làm bài ngay!
            </p>
            <Link
              href="/student/practice"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-indigo-700 transition"
            >
              Chọn dạng bài ôn luyện →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {historyList.map((item) => {
              const isHigh = item.score >= 8;
              const isMed = item.score >= 5 && item.score < 8;

              return (
                <div
                  key={item._id}
                  className="py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-3 -mx-3 rounded-2xl transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        {item.subject_name}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-xs text-slate-400">
                        {formatDate(item.submit_time)}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-xs text-slate-500">
                        Thời gian: {formatTime(item.duration_seconds)}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {item.practice_title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ {item.total_correct} đúng
                      </span>
                      <span>•</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        ✗ {item.total_wrong} sai
                      </span>
                      <span>•</span>
                      <span>Tổng {item.total_questions} câu</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {/* Điểm số */}
                    <div className="text-right">
                      <div
                        className={`text-xl sm:text-2xl font-black ${
                          isHigh
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isMed
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {item.score}
                        <span className="text-xs font-normal text-slate-400"> / 10</span>
                      </div>
                    </div>

                    {/* Nút Xem lại chi tiết */}
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(item._id)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 font-bold text-xs transition cursor-pointer"
                    >
                      Xem bài làm →
                    </button>

                    {/* Nút Luyện lại */}
                    {item.topic_id && (
                      <button
                        type="button"
                        onClick={() => handlePracticeAgain(item.topic_id)}
                        className="px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-bold text-xs transition cursor-pointer"
                        title="Bốc câu hỏi mới để luyện lại dạng bài này"
                      >
                        Luyện lại ↺
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Modal Xem Chi Tiết Bài Làm & Ôn Lại Câu Sai */}
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-1">
                  Xem lại lời giải chi tiết
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {attemptDetail?.practice_title || "Chi tiết bài làm tự luyện"}
                </h3>
                {attemptDetail && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Điểm số: <strong className="text-indigo-600">{attemptDetail.score}/10</strong> •{" "}
                    Đúng {attemptDetail.total_correct}/{attemptDetail.total_questions} câu • Thời gian:{" "}
                    {formatTime(attemptDetail.duration_seconds)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Bộ lọc phân loại câu hỏi (Tất cả / Câu đúng / Câu sai) */}
                {attemptDetail && (
                  <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                    <button
                      type="button"
                      onClick={() => setFilterQuestionType("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        filterQuestionType === "all"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Tất cả ({attemptDetail.total_questions})
                    </button>

                    <button
                      type="button"
                      disabled={attemptDetail.total_correct === 0}
                      onClick={() => setFilterQuestionType("correct")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        attemptDetail.total_correct === 0
                          ? "opacity-40 cursor-not-allowed text-slate-400"
                          : filterQuestionType === "correct"
                          ? "bg-emerald-500 text-white shadow-xs cursor-pointer"
                          : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                      }`}
                      title={
                        attemptDetail.total_correct === 0
                          ? "Không có câu hỏi nào làm đúng"
                          : `Lọc xem ${attemptDetail.total_correct} câu làm đúng`
                      }
                    >
                      <span>✓ Đúng</span>
                      <span>({attemptDetail.total_correct})</span>
                    </button>

                    <button
                      type="button"
                      disabled={attemptDetail.total_wrong === 0}
                      onClick={() => setFilterQuestionType("wrong")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        attemptDetail.total_wrong === 0
                          ? "opacity-40 cursor-not-allowed text-slate-400"
                          : filterQuestionType === "wrong"
                          ? "bg-rose-500 text-white shadow-xs cursor-pointer"
                          : "text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      }`}
                      title={
                        attemptDetail.total_wrong === 0
                          ? "Bài thi đạt điểm tuyệt đối 100%, không có câu sai nào"
                          : `Lọc xem ${attemptDetail.total_wrong} câu làm sai`
                      }
                    >
                      <span>✗ Sai</span>
                      <span>({attemptDetail.total_wrong})</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setSelectedAttemptId(null)}
                  className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 flex items-center justify-center cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Phân tích AI & Danh sách câu hỏi */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
              {/* Trợ lý AI Phân Tích Lỗ Hổng Kiến Thức */}
              {selectedAttemptId && (
                <AiAttemptAnalysisCard
                  attemptId={selectedAttemptId}
                  onTopicSelectedForPractice={(tId) => {
                    setSelectedAttemptId(null);
                    router.push(`/student/practice?topicId=${tId}`);
                  }}
                />
              )}
              {loadingDetail ? (
                <div className="py-12 text-center">
                  <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs text-slate-500">Đang tải chi tiết câu hỏi & lời giải...</p>
                </div>
              ) : !attemptDetail ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Không tìm thấy dữ liệu bài làm.
                </div>
              ) : (() => {
                const filteredAnswers = attemptDetail.answers.filter((ans) => {
                  if (filterQuestionType === "correct") return ans.is_correct;
                  if (filterQuestionType === "wrong") return !ans.is_correct;
                  return true;
                });

                if (filteredAnswers.length === 0) {
                  return (
                    <div className="py-8 px-6 text-center bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center justify-center mx-auto mb-2 text-xl font-bold">
                        {filterQuestionType === "wrong" ? "🎉" : "ℹ️"}
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                        {filterQuestionType === "wrong"
                          ? "Không có câu hỏi nào làm sai!"
                          : filterQuestionType === "correct"
                          ? "Không có câu hỏi nào làm đúng!"
                          : "Không có câu hỏi nào trong danh sách."}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        {filterQuestionType === "wrong"
                          ? "Chúc mừng! Bạn đã trả lời đúng 100% tất cả các câu hỏi trong lượt làm bài này."
                          : filterQuestionType === "correct"
                          ? "Chưa có câu hỏi nào trả lời đúng trong lượt làm bài này."
                          : "Không có câu hỏi nào phù hợp với bộ lọc hiện tại."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setFilterQuestionType("all")}
                        className="mt-3.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                      >
                        Hiển thị lại toàn bộ {attemptDetail.answers.length} câu hỏi
                      </button>
                    </div>
                  );
                }

                return filteredAnswers.map((ans, idx) => {
                  const correctOpt = ans.options.find((o) => o.is_correct);

                  return (
                    <div
                      key={ans.question_id || idx}
                      className={`p-5 rounded-2xl border-2 transition ${
                        ans.is_correct
                          ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20"
                          : "border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20"
                      }`}
                    >
                      {/* Status bar */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-extrabold text-xs text-slate-700 dark:text-slate-300">
                          Câu {ans.index}
                        </span>
                        {ans.is_correct ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                            ✓ Làm đúng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                            ✗ Làm sai
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white leading-relaxed mb-4 whitespace-pre-line">
                        {ans.content}
                      </div>

                      {/* Options */}
                      <div className="space-y-2 mb-4">
                        {ans.options.map((opt) => {
                          const isChosen = ans.selected_option_id === opt._id;
                          const isAnswerCorrect = opt.is_correct;

                          let optStyle =
                            "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";
                          if (isAnswerCorrect) {
                            optStyle =
                              "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 font-semibold text-emerald-900 dark:text-emerald-100";
                          } else if (isChosen && !isAnswerCorrect) {
                            optStyle =
                              "border-rose-500 bg-rose-50 dark:bg-rose-950/60 font-semibold text-rose-900 dark:text-rose-100";
                          }

                          return (
                            <div
                              key={opt._id}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-xs leading-snug ${optStyle}`}
                            >
                              <span className="font-bold shrink-0">{opt.option_label}.</span>
                              <span className="flex-1">{opt.content}</span>
                              {isAnswerCorrect && (
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                  [Đáp án đúng]
                                </span>
                              )}
                              {isChosen && !isAnswerCorrect && (
                                <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
                                  [Bạn đã chọn]
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation Box */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                          💡 Phương pháp giải &amp; Lời giải chi tiết:
                        </span>
                        <div className="whitespace-pre-line font-mono text-[11px] leading-relaxed">
                          {ans.explanation?.trim()
                            ? ans.explanation
                            : `Đáp án đúng là ${correctOpt?.option_label}. (Chưa có phân tích bổ sung).`}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedAttemptId(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
