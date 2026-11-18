"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SubtopicProgress {
  attempts_count: number;
  highest_score: number;
  last_score: number;
  status: "not_started" | "in_progress" | "mastered";
}

interface DifficultyBreakdown {
  easy: number;
  medium: number;
  hard: number;
}

interface SubtopicItem {
  _id: string;
  topic_name: string;
  description: string;
  level: number;
  question_count: number;
  difficulty_breakdown: DifficultyBreakdown;
  progress: SubtopicProgress;
}

interface ChapterItem {
  _id: string;
  topic_name: string;
  description: string;
  level: number;
  total_questions: number;
  subtopics: SubtopicItem[];
  progress: {
    attempts_count: number;
    highest_score: number;
  };
}

interface SubjectItem {
  _id: string;
  subject_name: string;
  description: string;
}

export default function PracticeCatalogView() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [stats, setStats] = useState<{ totalQuestions: number; totalPracticedAttempts: number }>({
    totalQuestions: 0,
    totalPracticedAttempts: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(new Set());

  // Modal khởi tạo lượt ôn tập
  const [modalTopic, setModalTopic] = useState<SubtopicItem | null>(null);
  const [modalQuestionCount, setModalQuestionCount] = useState<number>(10);
  const [modalDifficulty, setModalDifficulty] = useState<string>("all");
  const [startingSession, setStartingSession] = useState<boolean>(false);
  const [startError, setStartError] = useState<string>("");

  // Tải danh sách môn học và cây chuyên đề ban đầu khi mount
  useEffect(() => {
    let isCancelled = false;

    async function fetchInitialTopics() {
      try {
        const res = await fetch("/api/student/practice/topics");
        const data = await res.json();

        if (!isCancelled && data.success) {
          setSubjects(data.subjects || []);
          setSelectedSubjectId(data.selected_subject_id || "");
          setChapters(data.chapters || []);
          setStats(data.stats || { totalQuestions: 0, totalPracticedAttempts: 0 });

          // Mặc định đóng (gập) tất cả các chuyên đề để giao diện gọn gàng, người dùng cần mở chuyên đề nào thì tự bấm
          setExpandedChapterIds(new Set());
        }
      } catch (err) {
        console.error("Lỗi khi tải cây kiến thức:", err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchInitialTopics();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Đổi môn học
  const handleSelectSubject = async (subId: string) => {
    if (subId === selectedSubjectId) return;
    try {
      setSelectedSubjectId(subId);
      setLoading(true);
      const res = await fetch(
        `/api/student/practice/topics?subject_id=${encodeURIComponent(subId)}`
      );
      const data = await res.json();

      if (data.success) {
        setChapters(data.chapters || []);
        setStats(data.stats || { totalQuestions: 0, totalPracticedAttempts: 0 });

        // Mặc định gập tất cả chuyên đề lại khi đổi môn
        setExpandedChapterIds(new Set());
      }
    } catch (err) {
      console.error("Lỗi khi đổi môn học:", err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle mở/gập chuyên đề
  const toggleChapter = (chapterId: string) => {
    setExpandedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  // Mở tất cả / Gập tất cả
  const handleExpandAll = () => {
    setExpandedChapterIds(new Set(chapters.map((c) => c._id)));
  };

  const handleCollapseAll = () => {
    setExpandedChapterIds(new Set());
  };

  // Mở modal bắt đầu tự luyện cho 1 dạng bài
  const openStartModal = (subtopic: SubtopicItem) => {
    setModalTopic(subtopic);
    // Nếu kho câu hỏi ít hơn 10 thì mặc định là toàn bộ số câu hỏi
    const defaultCount = subtopic.question_count < 10 ? Math.max(1, subtopic.question_count) : 10;
    setModalQuestionCount(defaultCount);
    setModalDifficulty("all");
    setStartError("");
  };

  // Gửi yêu cầu bắt đầu phiên làm bài
  const handleStartPractice = async () => {
    if (!modalTopic) return;
    try {
      setStartingSession(true);
      setStartError("");

      const res = await fetch("/api/student/practice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: modalTopic._id,
          question_count: modalQuestionCount,
          difficulty: modalDifficulty,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStartError(data.message || "Không thể bắt đầu phiên tự luyện.");
        setStartingSession(false);
        return;
      }

      // Lưu tạm dữ liệu câu hỏi vào sessionStorage để tải nhanh không độ trễ
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`practice_session_${data.attempt_id}`, JSON.stringify(data));
      }

      // Chuyển hướng sang giao diện phòng tự luyện
      router.push(`/student/practice/session/${data.attempt_id}`);
    } catch (err) {
      console.error("Lỗi bắt đầu ôn tập:", err);
      setStartError("Có lỗi kết nối máy chủ. Vui lòng thử lại!");
      setStartingSession(false);
    }
  };

  // Lọc cây chuyên đề theo từ khóa tìm kiếm
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase().trim();

    return chapters
      .map((chap) => {
        const matchChapName = chap.topic_name.toLowerCase().includes(q);
        const matchedSubs = chap.subtopics.filter((sub) =>
          sub.topic_name.toLowerCase().includes(q)
        );

        if (matchChapName || matchedSubs.length > 0) {
          return {
            ...chap,
            subtopics: matchChapName ? chap.subtopics : matchedSubs,
          };
        }
        return null;
      })
      .filter(Boolean) as ChapterItem[];
  }, [chapters, searchQuery]);

  return (
    <div className="space-y-8">
      {/* 1. Header Banner & Động Lực Học Tập */}
      <div className="relative rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 p-6 sm:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-blue-100 backdrop-blur-md mb-3 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              PB09 — Tự Luyện Không Áp Lực &amp; Khắc Phục Lỗ Hổng Kiến Thức
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              Ôn Tập Theo Từng Chuyên Đề &amp; Dạng Bài
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-blue-100 leading-relaxed font-normal">
              Chọn dạng bài bạn muốn củng cố. Trong chế độ này, bạn làm bài tự do,
              không áp lực thời gian và có thể <strong>bấm xem ngay đáp án &amp; lời giải chi tiết</strong> sau mỗi câu hỏi để tích lũy phương pháp giải nhanh!
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/student/practice/history"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-900 font-bold text-xs shadow-md hover:bg-blue-50 transition active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Lịch Sử Tự Luyện ({stats.totalPracticedAttempts})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Bộ Lọc Môn Học & Tìm Kiếm */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Danh sách tabs Môn học */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Môn học:
            </span>
            {subjects.map((sub) => {
              const isActive = sub._id === selectedSubjectId;
              return (
                <button
                  key={sub._id}
                  onClick={() => handleSelectSubject(sub._id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {sub.subject_name}
                </button>
              );
            })}
          </div>

          {/* Ô tìm kiếm dạng bài */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <input
                type="text"
                placeholder="Tìm tên chuyên đề, dạng bài..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleExpandAll}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Mở tất cả chuyên đề"
              >
                Mở hết
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                onClick={handleCollapseAll}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Gập tất cả chuyên đề"
              >
                Gập hết
              </button>
            </div>
          </div>
        </div>

        {/* Thống kê nhanh của môn học */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-4">
            <span>
              Tổng số chuyên đề: <strong className="text-slate-800 dark:text-slate-200">{chapters.length}</strong>
            </span>
            <span>•</span>
            <span>
              Tổng câu hỏi khả dụng: <strong className="text-indigo-600 dark:text-indigo-400">{stats.totalQuestions} câu</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" /> Chưa làm
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Đang luyện
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Đạt chuẩn / Thành thạo (≥ 8.0)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Danh Sách Cây Chuyên Đề & Dạng Bài */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Đang tải cây chuyên đề và ngân hàng câu hỏi...</p>
        </div>
      ) : filteredChapters.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
            Không tìm thấy chuyên đề nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `Không có chuyên đề hoặc dạng bài nào khớp với từ khóa "${searchQuery}". Hãy thử tìm từ khác.`
              : "Môn học này hiện chưa có chuyên đề kiến thức nào. Vui lòng quay lại sau!"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredChapters.map((chapter, chapIdx) => {
            const isExpanded = expandedChapterIds.has(chapter._id);

            return (
              <div
                key={chapter._id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs transition"
              >
                {/* Header Chuyên Đề Cấp 1 */}
                <div
                  onClick={() => toggleChapter(chapter._id)}
                  className="flex items-center justify-between p-5 sm:p-6 cursor-pointer select-none hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
                      {chapIdx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          Chuyên Đề Lớn
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {chapter.subtopics.length} dạng bài
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs text-indigo-600 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
                          Kho {chapter.total_questions} câu
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 truncate">
                        {chapter.topic_name}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center transition"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Danh Sách Dạng Bài Cấp 2 */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40">
                    {chapter.subtopics.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Chưa có dạng bài chi tiết nào trong chuyên đề này.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {chapter.subtopics.map((sub, subIdx) => {
                          const { progress, question_count } = sub;
                          const hasQuestions = question_count > 0;

                          return (
                            <div
                              key={sub._id}
                              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition group"
                            >
                              <div>
                                {/* Status Badge & Số câu */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="text-[11px] font-bold text-slate-400">
                                    Dạng {subIdx + 1}
                                  </span>

                                  {/* Huy hiệu tiến độ */}
                                  {progress.status === "mastered" ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                      <span>✓</span>
                                      <span>Thành thạo ({progress.highest_score}đ)</span>
                                    </span>
                                  ) : progress.status === "in_progress" ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                      <span>•</span>
                                      <span>Đang luyện ({progress.highest_score}đ)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                      Chưa làm
                                    </span>
                                  )}
                                </div>

                                {/* Tên dạng bài */}
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                  {sub.topic_name}
                                </h3>

                                {sub.description && (
                                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                                    {sub.description}
                                  </p>
                                )}

                                {/* Thẻ độ khó & Số câu */}
                                <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                                    Kho {question_count} câu
                                  </span>
                                  {sub.difficulty_breakdown.easy > 0 && (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium">
                                      {sub.difficulty_breakdown.easy} nhận biết
                                    </span>
                                  )}
                                  {sub.difficulty_breakdown.medium > 0 && (
                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium">
                                      {sub.difficulty_breakdown.medium} thông hiểu
                                    </span>
                                  )}
                                  {sub.difficulty_breakdown.hard > 0 && (
                                    <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-medium">
                                      {sub.difficulty_breakdown.hard} vận dụng
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Nút hành động */}
                              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                <span className="text-[11px] text-slate-400">
                                  {progress.attempts_count > 0
                                    ? `Đã luyện ${progress.attempts_count} lượt`
                                    : "Sẵn sàng tự luyện"}
                                </span>

                                {hasQuestions ? (
                                  <button
                                    onClick={() => openStartModal(sub)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                                  >
                                    <span>Luyện Dạng Này</span>
                                    <span>→</span>
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400 font-medium italic">
                                    Kho câu hỏi đang cập nhật
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal Tùy Chọn & Khởi Tạo Lượt Ôn Luyện */}
      {modalTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
                  <span>🎯</span>
                  <span>Cấu hình phiên tự luyện</span>
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {modalTopic.topic_name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kho dạng bài này hiện có <strong>{modalTopic.question_count} câu hỏi</strong>. Bạn có thể chọn số lượng câu và mức độ mong muốn.
                </p>
              </div>
              <button
                onClick={() => setModalTopic(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Lựa chọn số câu hỏi */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2.5">
                Số lượng câu hỏi muốn luyện:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, modalTopic.question_count].map((count, idx) => {
                  if (count <= 0) return null;
                  const isAll = idx === 3;
                  const isSelected = modalQuestionCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setModalQuestionCount(count)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {isAll ? `Tất cả (${count})` : `${count} câu`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mức độ câu hỏi */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2.5">
                Mức độ nhận thức:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "all", label: "Tất cả mức độ" },
                  { id: "easy", label: "Nhận biết" },
                  { id: "medium", label: "Thông hiểu" },
                  { id: "hard", label: "Vận dụng cao" },
                ].map((diff) => {
                  const isSelected = modalDifficulty === diff.id;
                  return (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setModalDifficulty(diff.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border transition cursor-pointer text-center ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold"
                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {diff.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ghi chú chế độ học tập */}
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>💡</span>
                <span>Chế độ tự luyện không áp lực</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
                • Không giới hạn thời gian nghiêm ngặt, không khóa màn hình hay bật webcam giám sát.
                <br />
                • Bạn có thể <strong>bấm nút [Kiểm tra đáp án]</strong> ngay sau khi chọn câu trả lời để đọc phân tích lời giải chi tiết và tránh bẫy câu hỏi!
              </p>
            </div>

            {startError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {startError}
              </div>
            )}

            {/* Nút hành động modal */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalTopic(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleStartPractice}
                disabled={startingSession}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer flex items-center gap-2"
              >
                {startingSession ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang bốc câu hỏi...</span>
                  </>
                ) : (
                  <>
                    <span>Bắt Đầu Làm Bài</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
