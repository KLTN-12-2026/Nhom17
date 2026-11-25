  "use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HistoryItem {
  _id: string;
  attempt_type?: "practice" | "official";
  room_code?: string | null;
  practice_title: string;
  subject_name: string;
  topic_name: string;
  topic_id: string | null;
  score: number;
  max_score?: number;
  normalized_score_10?: number;
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
  attempt_type?: "practice" | "official";
  room_code?: string | null;
  can_view_details?: boolean;
  waiting_room_finish?: boolean;
  practice_title: string;
  subject_name: string;
  topic_name: string;
  score: number;
  max_score?: number;
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

  // Bộ lọc danh sách ngoài
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "official" | "practice">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<"all" | "pass" | "fail">("all");
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest">("newest");

  // Modal xem lại chi tiết bài làm cũ
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [modalFilter, setModalFilter] = useState<"all" | "wrong" | "correct">("all");

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
              setModalFilter("all");
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
      setModalFilter("all");

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

  // Danh sách các môn học để lọc
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    historyList.forEach((item) => {
      if (item.subject_name) set.add(item.subject_name);
    });
    return Array.from(set);
  }, [historyList]);

  const officialCount = useMemo(
    () => historyList.filter((i) => i.attempt_type === "official").length,
    [historyList]
  );
  const practiceCount = useMemo(
    () => historyList.filter((i) => i.attempt_type === "practice").length,
    [historyList]
  );

  // Lọc và sắp xếp danh sách lịch sử
  const filteredHistory = useMemo(() => {
    return historyList
      .filter((item) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.practice_title?.toLowerCase().includes(q);
          const matchTopic = item.topic_name?.toLowerCase().includes(q);
          const matchSubject = item.subject_name?.toLowerCase().includes(q);
          const matchRoom = item.room_code?.toLowerCase().includes(q);
          if (!matchTitle && !matchTopic && !matchSubject && !matchRoom) return false;
        }
        // Type
        if (typeFilter !== "all" && item.attempt_type !== typeFilter) return false;
        // Subject
        if (subjectFilter !== "all" && item.subject_name !== subjectFilter) return false;
        // Score
        const norm10 =
          item.normalized_score_10 ??
          (item.max_score ? (item.score / item.max_score) * 10 : item.score);
        if (scoreFilter === "pass" && norm10 < 5) return false;
        if (scoreFilter === "fail" && norm10 >= 5) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "highest") {
          const scoreA = a.normalized_score_10 ?? a.score;
          const scoreB = b.normalized_score_10 ?? b.score;
          return scoreB - scoreA;
        }
        if (sortBy === "lowest") {
          const scoreA = a.normalized_score_10 ?? a.score;
          const scoreB = b.normalized_score_10 ?? b.score;
          return scoreA - scoreB;
        }
        return (
          new Date(b.submit_time || b.created_at).getTime() -
          new Date(a.submit_time || a.created_at).getTime()
        );
      });
  }, [historyList, searchQuery, typeFilter, subjectFilter, scoreFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* 1. Thống Kê Tổng Quan */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Lượt Thi &amp; Tự Luyện
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {stats.total_attempts} <span className="text-xs font-semibold text-slate-400">lượt</span>
              </div>
              <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                ✓ Tự giác củng cố kiến thức
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
              📝
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Điểm Trung Bình
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {stats.average_score} <span className="text-xs font-semibold text-slate-400">/ 10</span>
              </div>
              <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                {stats.average_score >= 8 ? "🌟 Thành thạo kiến thức" : stats.average_score >= 5 ? "📈 Đang tiến bộ đều đặn" : "⚡ Cần tăng cường ôn tập"}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
              🎯
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Câu Hỏi Đã Làm
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {stats.total_questions_practiced} <span className="text-xs font-semibold text-slate-400">câu</span>
              </div>
              <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                {stats.total_correct_practiced} câu trả lời đúng
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0">
              📚
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Tỷ Lệ Chính Xác
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.accuracy_rate}%
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Tích lũy từ tất cả lượt thi
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
              ⚡
            </div>
          </div>
        </div>
      )}

      {/* 2. Thanh Công Cụ Tìm Kiếm & Bộ Lọc Nâng Cao */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: Search input + Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên đề thi, mã phòng, chủ đề ôn tập..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "highest" | "lowest")}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="newest">Mới nhất trước</option>
              <option value="highest">Điểm cao nhất</option>
              <option value="lowest">Điểm thấp nhất</option>
            </select>
          </div>
        </div>

        {/* Row 2: Filter tabs & Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Type pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                typeFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              <span>Tất cả</span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/20 text-[10px]">
                {historyList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter("official")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                typeFilter === "official"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
              }`}
            >
              <span>🟢 Phòng thi Live</span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/20 text-[10px]">
                {officialCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter("practice")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                typeFilter === "practice"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 hover:bg-indigo-100"
              }`}
            >
              <span>📘 Tự luyện tập</span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/20 text-[10px]">
                {practiceCount}
              </span>
            </button>
          </div>

          {/* Subject & Score status filters */}
          <div className="flex flex-wrap items-center gap-2">
            {availableSubjects.length > 0 && (
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                <option value="all">Tất cả môn học</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            )}

            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value as "all" | "pass" | "fail")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <option value="all">Tất cả điểm số</option>
              <option value="pass">Đạt chuẩn (≥ 5 điểm)</option>
              <option value="fail">Cần cố gắng (&lt; 5 điểm)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Danh Sách Lịch Sử Làm Bài */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Lịch Sử Lượt Thi &amp; Ôn Luyện ({filteredHistory.length})
          </h2>
          {(searchQuery || typeFilter !== "all" || subjectFilter !== "all" || scoreFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("all");
                setSubjectFilter("all");
                setScoreFilter("all");
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-16 text-center shadow-xs">
            <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-500">Đang tải lịch sử bài làm...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-14 text-center shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
              📚
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
              Không tìm thấy lượt làm bài phù hợp
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {historyList.length === 0
                ? "Bạn chưa hoàn thành bài thi hay bài tự luyện nào. Hãy bắt đầu ngay để ghi nhận tiến độ!"
                : "Không có kết quả nào khớp với bộ lọc hoặc từ khóa tìm kiếm của bạn."}
            </p>
            {historyList.length === 0 ? (
              <Link
                href="/student/practice"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-indigo-700 transition"
              >
                <span>Bắt đầu luyện tập ngay →</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setSubjectFilter("all");
                  setScoreFilter("all");
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => {
              const maxScore = item.max_score || 10;
              const norm10 =
                item.normalized_score_10 ??
                (maxScore > 0 ? (item.score / maxScore) * 10 : item.score);
              const isHigh = norm10 >= 8;
              const isMed = norm10 >= 5 && norm10 < 8;
              const isOfficial = item.attempt_type === "official";

              return (
                <div
                  key={item._id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left Column: Metadata & Title */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          isOfficial
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        }`}
                      >
                        {isOfficial
                          ? `🟢 Thi phòng Live${item.room_code ? `: ${item.room_code}` : ""}`
                          : "📘 Tự luyện tập"}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.subject_name}
                      </span>

                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <span>📅</span> {formatDate(item.submit_time)}
                      </span>

                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <span>⏱️</span> {formatTime(item.duration_seconds)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {item.practice_title}
                    </h3>

                    <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
                        ✓ {item.total_correct} đúng
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold border border-rose-200/60 dark:border-rose-800/40">
                        ✗ {item.total_wrong} sai
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
                        Tổng {item.total_questions} câu
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Score & Action Buttons */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-left md:text-right">
                      <div
                        className={`text-2xl font-black ${
                          isHigh
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isMed
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {item.score}
                        <span className="text-xs font-semibold text-slate-400">
                          {" "}
                          / {maxScore}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isHigh
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isMed
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isHigh ? "Xuất sắc" : isMed ? "Đạt chuẩn" : "Cần ôn thêm"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(item._id)}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs shadow-xs transition cursor-pointer"
                      >
                        Xem bài làm →
                      </button>

                      {item.topic_id && (
                        <button
                          type="button"
                          onClick={() => handlePracticeAgain(item.topic_id)}
                          className="px-3 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-bold text-xs transition cursor-pointer"
                          title="Bốc bộ câu hỏi mới để luyện lại dạng bài này"
                        >
                          Luyện lại ↺
                        </button>
                      )}
                    </div>
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
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0 bg-slate-50/60 dark:bg-slate-800/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    {attemptDetail?.attempt_type === "official"
                      ? "Phòng thi trực tuyến"
                      : "Tự luyện tập"}
                  </span>
                  {attemptDetail?.subject_name && (
                    <span className="text-xs font-semibold text-slate-500">
                      • {attemptDetail.subject_name}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {attemptDetail?.practice_title || "Chi tiết bài làm"}
                </h3>
                {attemptDetail && (
                  <p className="text-xs text-slate-500">
                    Điểm số:{" "}
                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {attemptDetail.score}/{attemptDetail.max_score || 10}
                    </strong>{" "}
                    • Đúng {attemptDetail.total_correct}/{attemptDetail.total_questions} câu • Thời gian:{" "}
                    {formatTime(attemptDetail.duration_seconds)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedAttemptId(null)}
                  className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 flex items-center justify-center cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Filter tabs */}
            {attemptDetail && attemptDetail.can_view_details !== false && attemptDetail.answers && (
              <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Lọc câu hỏi:</span>
                <button
                  type="button"
                  onClick={() => setModalFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    modalFilter === "all"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  Tất cả ({attemptDetail.answers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter("wrong")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    modalFilter === "wrong"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100"
                  }`}
                >
                  Câu làm sai ({attemptDetail.answers.filter((a) => !a.is_correct).length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter("correct")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    modalFilter === "correct"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
                  }`}
                >
                  Câu làm đúng ({attemptDetail.answers.filter((a) => a.is_correct).length})
                </button>
              </div>
            )}

            {/* Modal Body: Danh sách câu hỏi */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {loadingDetail ? (
                <div className="py-12 text-center">
                  <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs text-slate-500">Đang tải chi tiết câu hỏi &amp; lời giải...</p>
                </div>
              ) : !attemptDetail ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Không tìm thấy dữ liệu bài làm.
                </div>
              ) : attemptDetail.can_view_details === false ? (
                <div className="py-10 px-6 text-center rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 space-y-2">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    {attemptDetail.waiting_room_finish
                      ? "Phòng thi vẫn đang diễn ra"
                      : "Không được phép xem đáp án chi tiết"}
                  </p>
                  <p className="text-xs text-amber-700/90 dark:text-amber-200/80 max-w-md mx-auto leading-relaxed">
                    {attemptDetail.waiting_room_finish
                      ? "Đáp án chi tiết và lời giải sẽ tự động mở khóa sau khi Giảng viên kết thúc ca thi hoặc hết giờ làm bài của phòng thi để chống lộ đề."
                      : "Giảng viên đã cấu hình không hiển thị đáp án chi tiết cho đề thi này."}
                  </p>
                </div>
              ) : (
                attemptDetail.answers
                  .filter((ans) => {
                    if (modalFilter === "wrong") return !ans.is_correct;
                    if (modalFilter === "correct") return ans.is_correct;
                    return true;
                  })
                  .map((ans, idx) => {
                    const correctOpt = ans.options.find((o) => o.is_correct);

                    return (
                      <div
                        key={ans.question_id || idx}
                        className={`p-4 sm:p-5 rounded-2xl border transition bg-white dark:bg-slate-900 shadow-xs ${
                          ans.is_correct
                            ? "border-emerald-200 dark:border-emerald-900/60"
                            : "border-rose-200 dark:border-rose-900/60"
                        }`}
                      >
                        {/* Status bar */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                            Câu {ans.index}
                          </span>
                          {ans.is_correct ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              ✓ Làm đúng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              ✗ Làm sai
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed mb-4 whitespace-pre-line">
                          {ans.content}
                        </div>

                        {/* Options */}
                        <div className="space-y-2 mb-4">
                          {ans.options.map((opt) => {
                            const isChosen = ans.selected_option_id === opt._id;
                            const isAnswerCorrect = Boolean(opt.is_correct);

                            let optStyle =
                              "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300";
                            let badge = null;

                            if (isAnswerCorrect && isChosen) {
                              optStyle =
                                "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-medium ring-1 ring-emerald-500/30";
                              badge = (
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 text-xs">
                                  ✓ Đáp án đúng &amp; Bạn đã chọn
                                </span>
                              );
                            } else if (isAnswerCorrect && !isChosen) {
                              optStyle =
                                "border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 font-medium";
                              badge = (
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 text-xs">
                                  ✓ Đáp án đúng
                                </span>
                              );
                            } else if (isChosen && !isAnswerCorrect) {
                              optStyle =
                                "border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 ring-1 ring-rose-400/40";
                              badge = (
                                <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0 text-xs">
                                  ✗ Bạn đã chọn
                                </span>
                              );
                            }

                            return (
                              <div
                                key={opt._id}
                                className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-xs sm:text-sm leading-relaxed ${optStyle}`}
                              >
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 font-bold shrink-0 flex items-center justify-center text-xs">
                                    {opt.option_label}
                                  </span>
                                  <span className="pt-0.5 flex-1">{opt.content}</span>
                                </div>
                                {badge}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Box */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                            💡 Phương pháp giải &amp; Lời giải chi tiết:
                          </span>
                          <div className="whitespace-pre-line text-xs leading-relaxed">
                            {ans.explanation?.trim()
                              ? ans.explanation
                              : `Đáp án đúng là ${correctOpt?.option_label}. (Chưa có phân tích bổ sung).`}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedAttemptId(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition cursor-pointer"
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
