"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ExamOptionDTO {
  _id: string;
  option_label: string;
  content: string;
  is_correct?: boolean;
}

interface ExamQuestionDTO {
  index: number;
  _id: string;
  question_score: number;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  selected_option_id: string | null;
  options: ExamOptionDTO[];
}

interface DetailedAnswerDTO {
  index: number;
  question_id: string;
  content: string;
  difficulty_level: string;
  explanation?: string;
  options: ExamOptionDTO[];
  selected_option_id: string | null;
  is_correct: boolean;
}

interface ExamResultDTO {
  score: number;
  total_correct: number;
  total_wrong: number;
  total_questions: number;
  duration_seconds: number;
  submit_time: string;
  status: string;
  waiting_room_finish?: boolean;
  detailed_answers?: DetailedAnswerDTO[];
}

interface ExamMetaDTO {
  _id: string;
  title: string;
  subject_name: string;
  duration_minutes: number;
  max_score: number;
  pass_score: number;
  total_questions: number;
  allow_view_result_immediately: boolean;
}

interface RoomMetaDTO {
  _id: string;
  room_code: string;
  status: "waiting" | "in_progress" | "finished";
  start_time: string;
  end_time: string;
  teacher_name?: string;
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatDurationText(seconds: number): string {
  if (!seconds || seconds <= 0) return "< 1 giây";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} giây`;
  return `${mins} phút ${secs} giây`;
}

export default function OfficialExamSessionView({
  roomId,
}: {
  roomId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attemptId, setAttemptId] = useState("");
  const [roomMeta, setRoomMeta] = useState<RoomMetaDTO | null>(null);
  const [examMeta, setExamMeta] = useState<ExamMetaDTO | null>(null);
  const [questions, setQuestions] = useState<ExamQuestionDTO[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Đáp án đã chọn: Map<question_id, selected_option_id>
  const [selectedAnswers, setSelectedAnswers] = useState<Map<string, string>>(
    new Map()
  );
  // Các câu được đánh dấu xem lại
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  // Trạng thái lưu tự động
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "offline"
  >("idle");
  const [lastSavedText, setLastSavedText] = useState("");

  // Đồng hồ đếm ngược đồng bộ server
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Trạng thái nộp bài & kết quả
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [examResult, setExamResult] = useState<ExamResultDTO | null>(null);
  const [onlyShowWrong, setOnlyShowWrong] = useState(false);

  const autoSubmitTriggeredRef = useRef(false);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/student/exam/${roomId}/session`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (res.status === 403 && data.room_status === "waiting") {
        router.replace(`/student/join-room?roomId=${roomId}`);
        return;
      }

      if (res.status === 403 && data.require_join) {
        router.replace("/student/join-room");
        return;
      }

      if (!res.ok || !data.success) {
        setLoadError(data.message || "Không thể mở phiên làm bài thi.");
        return;
      }

      setAttemptId(data.attempt_id || "");
      setRoomMeta(data.room || null);
      setExamMeta(data.exam || null);

      if (data.status !== "in_progress" && data.result) {
        setExamResult(data.result);
        setIsLocked(true);
        return;
      }

      const loadedQuestions: ExamQuestionDTO[] = data.questions || [];
      setQuestions(loadedQuestions);

      const initialMap = new Map<string, string>();
      for (const q of loadedQuestions) {
        if (q.selected_option_id) {
          initialMap.set(q._id, q.selected_option_id);
        }
      }

      // Khôi phục backup localStorage nếu có đáp án chưa kịp đồng bộ lên server
      if (data.attempt_id && typeof window !== "undefined") {
        try {
          const rawBackup = localStorage.getItem(
            `official_exam_backup_${data.attempt_id}`
          );
          if (rawBackup) {
            const parsedBackup = JSON.parse(rawBackup) as Record<string, string>;
            const pendingToSync: Array<{
              question_id: string;
              selected_option_id: string;
              client_timestamp: number;
            }> = [];

            const syncTimestamp = Date.now();
            for (const [qId, optId] of Object.entries(parsedBackup)) {
              if (optId && initialMap.get(qId) !== optId) {
                initialMap.set(qId, optId);
                pendingToSync.push({
                  question_id: qId,
                  selected_option_id: optId,
                  client_timestamp: syncTimestamp,
                });
              }
            }

            if (pendingToSync.length > 0) {
              fetch(`/api/student/exam/${roomId}/save-answer`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers: pendingToSync }),
              }).catch(() => {});
            }
          }
        } catch {
          // Bỏ qua lỗi parse backup
        }
      }

      setSelectedAnswers(initialMap);

      if (data.server_now) {
        setServerOffsetMs(new Date(data.server_now).getTime() - Date.now());
      }
      if (typeof data.remaining_seconds === "number") {
        setRemainingSeconds(data.remaining_seconds);
      }
    } catch {
      setLoadError("Lỗi kết nối máy chủ khi tải đề thi.");
    } finally {
      setLoading(false);
    }
  }, [roomId, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSession();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSession]);

  const handleSubmitExam = useCallback(
    async (isAutoSubmit = false) => {
      if (submitting || examResult) return;
      setSubmitting(true);
      setIsLocked(true);
      setShowSubmitConfirm(false);

      const answersPayload = questions.map((q) => ({
        question_id: q._id,
        selected_option_id: selectedAnswers.get(q._id) || null,
      }));

      try {
        const res = await fetch(`/api/student/exam/${roomId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_auto_submit: isAutoSubmit,
            answers: answersPayload,
          }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (attemptId && typeof window !== "undefined") {
            localStorage.removeItem(`official_exam_backup_${attemptId}`);
          }
          setExamResult({
            score: data.score,
            total_correct: data.total_correct,
            total_wrong: data.total_wrong,
            total_questions: data.total_questions,
            duration_seconds: data.duration_seconds,
            submit_time: data.submit_time,
            status: data.status,
            waiting_room_finish: Boolean(data.waiting_room_finish),
            detailed_answers: data.detailed_answers || [],
          });
          // Nếu kết quả trả về từ idempotent submit chưa kèm detailed_answers -> gọi lại session
          if (
            data.already_submitted &&
            data.allow_view_result_immediately &&
            (!data.detailed_answers || data.detailed_answers.length === 0)
          ) {
            await loadSession();
          }
        } else {
          setLoadError(data.message || "Không thể nộp bài thi.");
          if (!isAutoSubmit) {
            setIsLocked(false);
          }
        }
      } catch {
        setLoadError("Mất kết nối khi nộp bài. Vui lòng thử bấm Nộp bài lại.");
        if (!isAutoSubmit) {
          setIsLocked(false);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [
      submitting,
      examResult,
      questions,
      selectedAnswers,
      roomId,
      attemptId,
      loadSession,
    ]
  );

  // Đồng hồ đếm ngược thời gian thực & tự động nộp khi hết giờ
  useEffect(() => {
    if (examResult || !roomMeta || roomMeta.status !== "in_progress") return;

    const endMs = new Date(roomMeta.end_time).getTime();

    const tick = () => {
      const nowServerMs = Date.now() + serverOffsetMs;
      const diff = Math.max(0, Math.floor((endMs - nowServerMs) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0 && !autoSubmitTriggeredRef.current) {
        autoSubmitTriggeredRef.current = true;
        handleSubmitExam(true);
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [examResult, roomMeta, serverOffsetMs, handleSubmitExam]);

  // Đồng bộ trạng thái phòng thi mỗi 5 giây (khi đang làm bài hoặc đang chờ ca thi kết thúc để xem đáp án)
  useEffect(() => {
    const shouldPollRoom =
      (!examResult && roomMeta?.status === "in_progress") ||
      Boolean(examResult?.waiting_room_finish);
    if (!shouldPollRoom) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/student/rooms/${roomId}/status`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.success && data.room?.status === "finished") {
          if (!autoSubmitTriggeredRef.current || examResult?.waiting_room_finish) {
            autoSubmitTriggeredRef.current = true;
            await loadSession();
          }
        }
      } catch {
        // Ignore transient network errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [examResult, roomMeta?.status, roomId, loadSession]);

  // Gửi tín hiệu ngắt kết nối nếu đóng tab khi bài chưa nộp
  useEffect(() => {
    if (examResult || roomMeta?.status !== "in_progress") return;

    const handlePageHide = () => {
      try {
        const blob = new Blob([JSON.stringify({ action: "disconnect" })], {
          type: "application/json",
        });
        navigator.sendBeacon(`/api/student/rooms/${roomId}/status`, blob);
      } catch {
        // Ignore beacon errors
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [examResult, roomMeta?.status, roomId]);

  const handleSelectOption = useCallback(
    async (questionId: string, optionId: string) => {
      if (isLocked || examResult || submitting) return;

      const clickTimestamp = new Date().getTime();
      const nextMap = new Map(selectedAnswers);
      nextMap.set(questionId, optionId);
      setSelectedAnswers(nextMap);

      // Backup local ngay lập tức
      if (attemptId && typeof window !== "undefined") {
        try {
          const obj: Record<string, string> = {};
          nextMap.forEach((v, k) => {
            obj[k] = v;
          });
          localStorage.setItem(
            `official_exam_backup_${attemptId}`,
            JSON.stringify(obj)
          );
        } catch {
          // Ignore storage quota errors
        }
      }

      // Auto-save lên Server
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/student/exam/${roomId}/save-answer`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_id: questionId,
            selected_option_id: optionId,
            client_timestamp: clickTimestamp,
          }),
        });
        const data = await res.json();

        if (res.status === 403 && data.timed_out) {
          if (!autoSubmitTriggeredRef.current) {
            autoSubmitTriggeredRef.current = true;
            handleSubmitExam(true);
          }
          return;
        }

        if (res.ok && data.success) {
          setSaveStatus("saved");
          const now = new Date();
          setLastSavedText(
            `${String(now.getHours()).padStart(2, "0")}:${String(
              now.getMinutes()
            ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
          );
        } else {
          setSaveStatus("offline");
        }
      } catch {
        setSaveStatus("offline");
      }
    },
    [
      isLocked,
      examResult,
      submitting,
      selectedAnswers,
      attemptId,
      roomId,
      handleSubmitExam,
    ]
  );

  const toggleFlagQuestion = (questionId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const answeredCount = useMemo(() => {
    return questions.filter((q) => selectedAnswers.has(q._id)).length;
  }, [questions, selectedAnswers]);

  const currentQuestion = questions[currentIndex] || null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="text-center space-y-3">
          <div className="inline-block w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Đang tải đề thi và đồng bộ đồng hồ máy chủ...
          </p>
        </div>
      </div>
    );
  }

  if (loadError && !examResult && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Không thể truy cập bài thi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {loadError}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link
              href="/student/join-room"
              className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold"
            >
              Nhập lại mã phòng
            </Link>
            <Link
              href="/student"
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Về Góc học tập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MÀN HÌNH KẾT QUẢ SAU KHI NỘP BÀI
  // =========================================================================
  if (examResult) {
    const maxScore = examMeta?.max_score || 10;
    const passScore = examMeta?.pass_score ?? maxScore / 2;
    const passed = examResult.score >= passScore;
    const detailedList = examResult.detailed_answers || [];
    const displayedDetails = onlyShowWrong
      ? detailedList.filter((d) => !d.is_correct)
      : detailedList;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Card Tổng Kết Điểm */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      examResult.status === "timed_out"
                        ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    }`}
                  >
                    {examResult.status === "timed_out"
                      ? "⏱ Hết giờ — Hệ thống đã tự động thu bài"
                      : "✓ Đã nộp bài thành công"}
                  </span>
                  {roomMeta?.room_code && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                      Phòng: {roomMeta.room_code}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {examMeta?.title || "Kết Quả Bài Thi"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {examMeta?.subject_name} • Thời gian làm bài:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {formatDurationText(examResult.duration_seconds)}
                  </strong>
                </p>
              </div>

              <div className="shrink-0 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white px-7 py-5 text-center min-w-[170px]">
                <span className="block text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                  Điểm số đạt được
                </span>
                <div
                  className={`text-4xl font-black mt-1 ${
                    passed ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {examResult.score}
                  <span className="text-base font-medium text-slate-400">
                    /{maxScore}
                  </span>
                </div>
                <span className="mt-1 inline-block text-xs font-semibold text-slate-300">
                  {passed ? "Đạt yêu cầu" : "Chưa đạt chuẩn"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 p-3">
                <span className="block text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  Câu trả lời đúng
                </span>
                <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {examResult.total_correct}
                </strong>
              </div>
              <div className="rounded-xl bg-rose-50/70 dark:bg-rose-950/30 p-3">
                <span className="block text-xs text-rose-700 dark:text-rose-300 font-medium">
                  Sai / Bỏ trống
                </span>
                <strong className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {examResult.total_wrong}
                </strong>
              </div>
              <div className="rounded-xl bg-slate-100 dark:bg-slate-800/60 p-3">
                <span className="block text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Tổng số câu
                </span>
                <strong className="text-xl font-black text-slate-900 dark:text-white">
                  {examResult.total_questions}
                </strong>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/student"
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition"
              >
                ← Về Góc học tập
              </Link>
              <Link
                href="/student/practice/history"
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Xem lịch sử làm bài
              </Link>
            </div>
          </div>

          {/* Chi tiết đáp án nếu đề cho phép xem ngay */}
          {examMeta?.allow_view_result_immediately && detailedList.length > 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Chi Tiết Bài Làm &amp; Đáp Án
                </h2>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyShowWrong}
                    onChange={(e) => setOnlyShowWrong(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Chỉ xem câu làm sai / bỏ trống</span>
                </label>
              </div>

              <div className="space-y-4">
                {displayedDetails.map((item) => (
                  <div
                    key={item.question_id}
                    className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${
                      item.is_correct
                        ? "border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10"
                        : "border-rose-200/80 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                        <span className="text-slate-500 mr-1.5">
                          Câu {item.index}:
                        </span>
                        {item.content}
                      </p>
                      <span
                        className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.is_correct
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                        }`}
                      >
                        {item.is_correct ? "Đúng" : "Sai"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.options.map((opt) => {
                        const isSelected = item.selected_option_id === opt._id;
                        const isRight = Boolean(opt.is_correct);

                        let optClass =
                          "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300";
                        if (isRight) {
                          optClass =
                            "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold";
                        } else if (isSelected && !isRight) {
                          optClass =
                            "border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200";
                        }

                        return (
                          <div
                            key={opt._id}
                            className={`rounded-xl border px-3.5 py-2.5 text-xs flex items-start gap-2 ${optClass}`}
                          >
                            <span className="font-bold shrink-0">
                              {opt.option_label}.
                            </span>
                            <span className="flex-1">{opt.content}</span>
                            {isRight && (
                              <span className="text-[10px] font-bold text-emerald-600 shrink-0">
                                ✓ Đáp án đúng
                              </span>
                            )}
                            {isSelected && !isRight && (
                              <span className="text-[10px] font-bold text-rose-600 shrink-0">
                                ✗ Bạn chọn
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {item.explanation && (
                      <div className="rounded-xl bg-slate-100/80 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-800 dark:text-white">
                          Giải thích:
                        </strong>{" "}
                        {item.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : examResult.waiting_room_finish ? (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 p-6 text-center space-y-2">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                Đang chờ ca thi kết thúc để mở đáp án chi tiết
              </p>
              <p className="text-xs sm:text-sm text-amber-700/90 dark:text-amber-200/80">
                Phòng thi vẫn đang diễn ra với các thí sinh khác. Đáp án chi tiết và lời giải sẽ tự động mở khóa ngay sau khi Giảng viên kết thúc ca thi hoặc hết giờ làm bài.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center text-xs sm:text-sm text-slate-500">
              Giảng viên cấu hình không hiển thị đáp án chi tiết ngay sau khi nộp bài. Điểm số của bạn đã được lưu vào hệ thống.
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // MÀN HÌNH LÀM BÀI THI TRỰC TUYẾN & ĐẾM NGƯỢC THỜI GIAN
  // =========================================================================
  const isDangerTime = remainingSeconds !== null && remainingSeconds <= 60;
  const isWarningTime =
    remainingSeconds !== null &&
    remainingSeconds > 60 &&
    remainingSeconds <= 300;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Topbar cố định: Thông tin đề, Trạng thái Auto-save, Đồng hồ đếm ngược, Nộp bài */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="hidden sm:flex min-w-8 h-8 px-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 items-center justify-center font-bold text-xs">
              PQP
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {examMeta?.title || "Phòng Thi Trực Tuyến"}
                </h1>
                {roomMeta?.room_code && (
                  <span className="hidden md:inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {roomMeta.room_code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>
                  Đã làm: {answeredCount}/{questions.length} câu
                </span>
                <span>•</span>
                {saveStatus === "saving" && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    Đang lưu tạm...
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Đã lưu tự động {lastSavedText ? `(${lastSavedText})` : ""}
                  </span>
                )}
                {saveStatus === "offline" && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Lưu tạm trên máy (mạng chậm)
                  </span>
                )}
                {saveStatus === "idle" && (
                  <span>Tự động lưu khi chọn đáp án</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            {/* Đồng hồ đếm ngược */}
            <div
              className={`px-3 sm:px-4 py-1.5 rounded-xl border font-mono text-base sm:text-lg font-black tracking-tight flex items-center gap-2 ${
                isDangerTime
                  ? "bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-400 animate-pulse"
                  : isWarningTime
                  ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300"
                  : "bg-slate-100 border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              }`}
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                {remainingSeconds !== null
                  ? formatCountdown(remainingSeconds)
                  : "--:--"}
              </span>
            </div>

            <button
              type="button"
              disabled={isLocked || submitting}
              onClick={() => setShowSubmitConfirm(true)}
              className="px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          </div>
        </div>
      </header>

      {/* Khu vực làm bài 2 cột */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái: Nội dung câu hỏi hiện tại */}
        <section className="lg:col-span-8 flex flex-col justify-between gap-5">
          {currentQuestion ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-6">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">
                    Câu {currentIndex + 1} / {questions.length}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({currentQuestion.question_score} điểm)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFlagQuestion(currentQuestion._id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    flaggedIds.has(currentQuestion._id)
                      ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {flaggedIds.has(currentQuestion._id)
                    ? "⚑ Đã đánh dấu xem lại"
                    : "⚐ Đánh dấu xem lại"}
                </button>
              </div>

              <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                {currentQuestion.content}
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((opt) => {
                  const isSelected =
                    selectedAnswers.get(currentQuestion._id) === opt._id;

                  return (
                    <button
                      key={opt._id}
                      type="button"
                      disabled={isLocked || submitting}
                      onClick={() =>
                        handleSelectOption(currentQuestion._id, opt._id)
                      }
                      className={`w-full text-left rounded-xl border p-4 transition flex items-start gap-3.5 cursor-pointer disabled:cursor-not-allowed ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/20"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {opt.option_label}
                      </span>
                      <span className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed pt-0.5">
                        {opt.content}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500">
              Không có câu hỏi nào trong đề thi.
            </div>
          )}

          {/* Điều hướng Trước / Sau */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              ← Câu trước
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
                }
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-bold hover:opacity-90 cursor-pointer"
              >
                Câu tiếp theo →
              </button>
            ) : (
              <button
                type="button"
                disabled={isLocked || submitting}
                onClick={() => setShowSubmitConfirm(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold cursor-pointer"
              >
                Hoàn tất &amp; Nộp bài ✓
              </button>
            )}
          </div>
        </section>

        {/* Cột phải: Bảng tổng quan câu hỏi (Question Palette) */}
        <aside className="lg:col-span-4">
          <div className="sticky top-22 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Danh Sách Câu Hỏi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bấm vào số câu để chuyển nhanh
              </p>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = selectedAnswers.has(q._id);
                const isFlagged = flaggedIds.has(q._id);

                let btnStyle =
                  "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300";
                if (isAnswered) {
                  btnStyle =
                    "border-blue-600 bg-blue-600 text-white font-bold";
                }
                if (isFlagged && !isAnswered) {
                  btnStyle =
                    "border-amber-400 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold";
                }

                return (
                  <button
                    key={q._id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative h-10 rounded-xl border text-xs font-semibold transition cursor-pointer ${btnStyle} ${
                      isCurrent ? "ring-2 ring-slate-900 dark:ring-white ring-offset-1" : ""
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white dark:border-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Chú thích màu sắc */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
                <span>Đã làm ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700 inline-block" />
                <span>
                  Chưa làm ({Math.max(0, questions.length - answeredCount)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
                <span>Đánh dấu ({flaggedIds.size})</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isLocked || submitting}
              onClick={() => setShowSubmitConfirm(true)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              Nộp Bài Thi ({answeredCount}/{questions.length} câu)
            </button>
          </div>
        </aside>
      </main>

      {/* Modal xác nhận nộp bài */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Xác Nhận Nộp Bài Thi
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn đã hoàn thành{" "}
              <strong className="text-slate-900 dark:text-white">
                {answeredCount} / {questions.length}
              </strong>{" "}
              câu hỏi.
              {answeredCount < questions.length && (
                <span className="block mt-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  Lưu ý: Vẫn còn {questions.length - answeredCount} câu hỏi chưa chọn đáp án!
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500">
              Sau khi xác nhận nộp bài, bạn chỉ được nộp 1 lần duy nhất và không thể thay đổi đáp án.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitExam(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Đang nộp bài..." : "Xác Nhận Nộp Bài"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
