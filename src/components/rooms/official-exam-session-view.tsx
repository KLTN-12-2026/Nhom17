"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWindowProctor, WindowViolationType } from "@/hooks/useWindowProctor";
import { useWebcamProctor, WebcamViolationType } from "@/hooks/useWebcamProctor";
import WebcamProctorView from "@/components/proctor/webcam-proctor-view";
import ViolationAlertModal from "@/components/proctor/violation-alert-modal";

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
  const [reviewFilter, setReviewFilter] = useState<"all" | "correct" | "wrong" | "unanswered">("all");

  // Trạng thái Giám sát & Chống gian lận AI (PB12)
  const [hasCheckedIn, setHasCheckedIn] = useState<boolean>(false);
  const stopCameraRef = useRef<() => void>(() => {});
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: string;
    description: string;
    evidenceSnapshot?: string | null;
  }>({
    isOpen: false,
    type: "",
    description: "",
    evidenceSnapshot: null,
  });

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
              }).catch(() => { });
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
    async (isAutoSubmit = false, forceStatus?: "submitted" | "revoked" | "timed_out") => {
      if (submitting || examResult) return;

      // Thoát toàn màn hình và ngắt camera khi nộp bài hoặc bị đình chỉ
      if (typeof document !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
      stopCameraRef.current();

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
            status: forceStatus || (isAutoSubmit ? "timed_out" : "submitted"),
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

  // Ghi nhận vi phạm vào hệ thống CSDL thật và Live Bus
  const reportViolationToBackend = useCallback(
    async (type: string, description: string, snapshot?: string) => {
      if (!attemptId) return;
      try {
        await fetch("/api/student/exam/violation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attempt_id: attemptId,
            room_id: roomId,
            violation_type: type,
            description,
            evidence_detail: snapshot || "",
            max_violations: 3,
          }),
        });
      } catch (e) {
        console.warn("Lỗi gửi vi phạm:", e);
      }
    },
    [attemptId, roomId]
  );

  const [violationCount, setViolationCount] = useState<number>(0);
  const lastViolationTimeRef = useRef<number>(0);
  const captureSnapshotRef = useRef<() => string>(() => "");

  // Hàm xử lý ghi nhận vi phạm duy nhất (tránh double dispatch & giới hạn tối đa 3 lần)
  const handleRecordViolation = useCallback(
    (type: string, description: string, snapshotBase64?: string) => {
      if (isLocked || examResult || violationCount >= 3) return;

      const now = Date.now();
      // Chặn ghi nhận dồn dập trong vòng 3.5 giây
      if (now - lastViolationTimeRef.current < 3500) {
        return;
      }
      lastViolationTimeRef.current = now;

      const snap = snapshotBase64 || captureSnapshotRef.current?.() || "";

      setModalState({
        isOpen: true,
        type,
        description,
        evidenceSnapshot: snap,
      });

      setViolationCount((prev) => {
        const next = Math.min(prev + 1, 3);
        if (next >= 3) {
          if (typeof document !== "undefined" && document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
          }
          void handleSubmitExam(true, "revoked");
        }
        return next;
      });

      reportViolationToBackend(type, description, snap);
    },
    [isLocked, examResult, violationCount, handleSubmitExam, reportViolationToBackend]
  );

  // Hook Giám Sát Cửa Sổ Trình Duyệt (Chỉ chạy khi đã Check-in và đang trong phòng thi)
  const {
    isFullscreen,
    isRevoked,
    requestFullscreen,
  } = useWindowProctor({
    enabled: hasCheckedIn && !examResult && !isLocked && roomMeta?.status === "in_progress",
    maxViolations: 3,
    requireFullscreen: true,
    gracePeriodMs: 6000,
    onViolation: (type: WindowViolationType, desc: string) => {
      handleRecordViolation(type, desc);
    },
    onRevoke: () => {
      if (typeof document !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
      void handleSubmitExam(true, "revoked");
    },
  });

  // Hook Giám Sát Camera AI (MediaPipe Face Detection)
  // Chỉ mở phần cứng camera khi: đã tải xong phiên, không có lỗi, chưa có kết quả, chưa bị khóa/đình chỉ, và phòng đang diễn ra
  const isCameraProctorActive =
    !loading &&
    !loadError &&
    !examResult &&
    !isLocked &&
    !isRevoked &&
    roomMeta?.status === "in_progress";

  const webcamProctor = useWebcamProctor({
    enabled: isCameraProctorActive,
    onViolation: (type: WebcamViolationType, desc: string, snapshotBase64: string) => {
      // Chỉ ghi nhận vi phạm khi thí sinh đã hoàn tất check-in và đang làm bài
      if (!hasCheckedIn) return;
      handleRecordViolation(type, desc, snapshotBase64);
    },
  });

  useEffect(() => {
    stopCameraRef.current = webcamProctor.stopCamera;
  }, [webcamProctor.stopCamera]);

  useEffect(() => {
    captureSnapshotRef.current = webcamProctor.captureSnapshot;
  }, [webcamProctor.captureSnapshot]);

  // Tự động thoát toàn màn hình và ngắt kết nối camera khi hoàn thành bài thi
  useEffect(() => {
    if (examResult) {
      if (typeof document !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
      stopCameraRef.current();
    }
  }, [examResult]);

  // Thao tác bắt đầu làm bài chính thức sau khi hoàn tất Check-in
  const handleStartOfficialExam = async () => {
    await requestFullscreen();
    setHasCheckedIn(true);
  };

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

    const totalQuestions = examResult.total_questions || detailedList.length || 0;
    const totalCorrect = examResult.total_correct ?? detailedList.filter((d) => d.is_correct).length;
    const totalUnanswered = detailedList.filter((d) => !d.selected_option_id).length;
    const totalWrong = detailedList.filter((d) => d.selected_option_id && !d.is_correct).length;
    const accuracyRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    const displayedDetails = detailedList.filter((item) => {
      if (reviewFilter === "correct") return item.is_correct;
      if (reviewFilter === "wrong") return item.selected_option_id && !item.is_correct;
      if (reviewFilter === "unanswered") return !item.selected_option_id;
      return true;
    });

    const scrollToQuestion = (qId: string) => {
      setReviewFilter("all");
      setTimeout(() => {
        const el = document.getElementById(`review-question-${qId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-blue-500", "shadow-md");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-blue-500", "shadow-md");
          }, 1800);
        }
      }, 50);
    };

    return (
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 py-6 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-[1440px] mx-auto space-y-6">
          {/* =========================================================================
              1. BẢNG TỔNG KẾT KẾT QUẢ THI COMPACT (TOP DASHBOARD)
             ========================================================================= */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
            {/* Top row: Status, room, privacy badge & Score */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      examResult.status === "timed_out"
                        ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                        : examResult.status === "revoked"
                          ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    }`}
                  >
                    {examResult.status === "timed_out"
                      ? "⏱ Hết giờ — Hệ thống đã thu bài"
                      : examResult.status === "revoked"
                        ? "⛔ Bài thi bị đình chỉ do vi phạm quy chế"
                        : "✓ Đã nộp bài thành công"}
                  </span>
                  {roomMeta?.room_code && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Mã phòng: {roomMeta.room_code}
                    </span>
                  )}
                  {examMeta?.subject_name && (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-semibold border border-blue-200/60 dark:border-blue-800">
                      {examMeta.subject_name}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {examMeta?.title || "Báo Cáo Kết Quả Bài Thi"}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Giảng viên: <strong className="text-slate-700 dark:text-slate-300">{roomMeta?.teacher_name || "Giảng viên"}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Thời gian làm bài: <strong className="text-slate-700 dark:text-slate-300">{formatDurationText(examResult.duration_seconds)}</strong>
                  </span>
                  {examResult.submit_time && (
                    <>
                      <span>•</span>
                      <span>
                        Nộp lúc: <strong className="text-slate-700 dark:text-slate-300">{new Date(examResult.submit_time).toLocaleTimeString("vi-VN")} {new Date(examResult.submit_time).toLocaleDateString("vi-VN")}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Score Box */}
              <div className="flex items-center gap-4 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl px-6 py-3.5 shrink-0">
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    Điểm số đạt được
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span
                      className={`text-3xl sm:text-4xl font-black ${
                        passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {examResult.score}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">/{maxScore}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold mt-1 px-2.5 py-0.5 rounded-full ${
                      passed
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}
                  >
                    {passed ? "✓ Đạt yêu cầu" : "✗ Chưa đạt chuẩn"}
                  </span>
                </div>
              </div>
            </div>

            {/* Thông báo trạng thái phòng thi & Quyền riêng tư */}
            <div className="mt-3.5 space-y-2">
              {roomMeta?.status === "finished" ? (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="text-sm">📢</span>
                  <span>Ca thi trực tuyến đã chính thức đóng. Bạn đang xem lại kết quả bài làm và bảng giải thích chi tiết đáp án.</span>
                </div>
              ) : examResult.waiting_room_finish ? (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-200">
                  <span className="text-sm">⏳</span>
                  <span>Bạn đã hoàn thành bài thi sớm. Ca thi tại phòng vẫn đang tiếp diễn. Lời giải chi tiết sẽ mở sau khi Giảng viên kết thúc ca thi hoặc hết giờ.</span>
                </div>
              ) : null}

              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                <span className="text-base shrink-0">🛡️</span>
                <span><strong>Bảo mật &amp; Quyền riêng tư:</strong> Giám sát AI và Camera đã được ngắt kết nối an toàn. Thiết bị của bạn không còn bị theo dõi.</span>
              </div>
            </div>

            {/* Metrics horizontal cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 p-3">
                <span className="block text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  Trả lời đúng
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <strong className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {totalCorrect}
                  </strong>
                  <span className="text-xs text-emerald-700/80 dark:text-emerald-400/80 font-semibold">
                    / {totalQuestions} câu
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 p-3">
                <span className="block text-xs text-rose-800 dark:text-rose-300 font-medium">
                  Trả lời sai
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <strong className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {totalWrong}
                  </strong>
                  <span className="text-xs text-rose-700/80 dark:text-rose-400/80 font-semibold">câu</span>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 p-3">
                <span className="block text-xs text-amber-800 dark:text-amber-300 font-medium">
                  Chưa trả lời
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <strong className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {totalUnanswered}
                  </strong>
                  <span className="text-xs text-amber-700/80 dark:text-amber-400/80 font-semibold">câu</span>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 p-3">
                <span className="block text-xs text-blue-800 dark:text-blue-300 font-medium">
                  Tỷ lệ chính xác
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <strong className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {accuracyRate}%
                  </strong>
                </div>
              </div>

              <div className="rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 p-3 col-span-2 sm:col-span-1">
                <span className="block text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Thời gian làm bài
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <strong className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
                    {formatDurationText(examResult.duration_seconds)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              2. PHẦN CHI TIẾT ĐÁP ÁN & ĐIỀU HƯỚNG CÂU HỎI (2-COLUMN LAYOUT)
             ========================================================================= */}
          {examMeta?.allow_view_result_immediately && detailedList.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Cột chính: Danh sách câu hỏi và lời giải chi tiết */}
              <div className="lg:col-span-8 xl:col-span-8 space-y-5">
                <div className="flex items-center justify-between pb-1">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Chi Tiết Bài Làm &amp; Lời Giải</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {displayedDetails.length}/{detailedList.length} câu
                    </span>
                  </h2>

                  {/* Filter chips on mobile / small screen */}
                  <div className="block lg:hidden text-xs text-slate-500">
                    Lọc: <strong>{reviewFilter === "all" ? "Tất cả" : reviewFilter === "correct" ? "Đúng" : reviewFilter === "wrong" ? "Sai" : "Chưa làm"}</strong>
                  </div>
                </div>

                {displayedDetails.length === 0 ? (
                  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500">
                    Không có câu hỏi nào khớp với bộ lọc hiện tại.
                  </div>
                ) : (
                  displayedDetails.map((item) => {
                    const isUnanswered = !item.selected_option_id;
                    const isRight = item.is_correct;

                    return (
                      <div
                        key={item.question_id}
                        id={`review-question-${item.question_id}`}
                        className={`rounded-2xl border p-5 sm:p-6 transition-all bg-white dark:bg-slate-900 shadow-sm ${
                          isRight
                            ? "border-emerald-200 dark:border-emerald-900/60"
                            : isUnanswered
                              ? "border-slate-300 dark:border-slate-700"
                              : "border-rose-200 dark:border-rose-900/60"
                        }`}
                      >
                        {/* Question Header */}
                        <div className="flex items-start justify-between gap-3 mb-3.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-800 dark:text-slate-200">
                              Câu {item.index}
                            </span>
                            {item.difficulty_level && (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 capitalize">
                                {item.difficulty_level === "easy"
                                  ? "Nhận biết"
                                  : item.difficulty_level === "medium"
                                    ? "Thông hiểu"
                                    : "Vận dụng"}
                              </span>
                            )}
                          </div>

                          {/* Status Badge */}
                          {isRight ? (
                            <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              ✓ Trả lời đúng
                            </span>
                          ) : isUnanswered ? (
                            <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                              ⚪ Chưa trả lời / Bỏ trống
                            </span>
                          ) : (
                            <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                              ✗ Trả lời sai
                            </span>
                          )}
                        </div>

                        {/* Question Text */}
                        <div className="text-slate-900 dark:text-white text-base sm:text-[16.5px] font-medium leading-relaxed mb-4">
                          {item.content}
                        </div>

                        {/* Options List */}
                        <div className="space-y-2.5">
                          {item.options.map((opt) => {
                            const isSelected = item.selected_option_id === opt._id;
                            const isCorrectOpt = Boolean(opt.is_correct);

                            let optionBoxStyle =
                              "border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300";
                            let letterStyle =
                              "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-600";
                            let statusPill = null;

                            if (isCorrectOpt && isSelected) {
                              // Đáp án đúng và thí sinh đã chọn
                              optionBoxStyle =
                                "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-medium ring-1 ring-emerald-500/30";
                              letterStyle = "bg-emerald-600 text-white font-bold border-transparent";
                              statusPill = (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 shrink-0">
                                  ✓ Đáp án đúng &amp; Bạn đã chọn
                                </span>
                              );
                            } else if (isCorrectOpt && !isSelected) {
                              // Đáp án đúng (thí sinh chọn đáp án khác hoặc bỏ trống)
                              optionBoxStyle =
                                "border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-medium";
                              letterStyle = "bg-emerald-500 text-white font-bold border-transparent";
                              statusPill = (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 shrink-0">
                                  ✓ Đáp án đúng
                                </span>
                              );
                            } else if (!isCorrectOpt && isSelected) {
                              // Thí sinh chọn sai
                              optionBoxStyle =
                                "border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-1 ring-rose-400/40";
                              letterStyle = "bg-rose-600 text-white font-bold border-transparent";
                              statusPill = (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 shrink-0">
                                  ✗ Bạn đã chọn
                                </span>
                              );
                            }

                            return (
                              <div
                                key={opt._id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3.5 sm:p-4 rounded-xl border text-sm transition ${optionBoxStyle}`}
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <span
                                    className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs ${letterStyle}`}
                                  >
                                    {opt.option_label}
                                  </span>
                                  <span className="pt-0.5 leading-relaxed break-words flex-1">
                                    {opt.content}
                                  </span>
                                </div>
                                {statusPill && <div className="pl-10 sm:pl-0 shrink-0">{statusPill}</div>}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Box */}
                        {item.explanation && (
                          <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5">
                            <div className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                              <span className="text-sm">💡</span>
                              <span>Giải Thích &amp; Phương Pháp Giải</span>
                            </div>
                            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-5 border-l-2 border-blue-400/80">
                              {item.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Cột Phụ: Sticky Sidebar điều hướng câu hỏi và lọc */}
              <div className="lg:col-span-4 xl:col-span-4 sticky top-6 space-y-5">
                {/* Panel Lọc câu hỏi */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Bộ Lọc Câu Hỏi
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewFilter("all")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        reviewFilter === "all"
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      <span>Tất cả</span>
                      <span className="text-[11px] opacity-80">{totalQuestions}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewFilter("correct")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        reviewFilter === "correct"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
                      }`}
                    >
                      <span>Làm đúng</span>
                      <span className="text-[11px] opacity-80">{totalCorrect}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewFilter("wrong")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        reviewFilter === "wrong"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100"
                      }`}
                    >
                      <span>Làm sai</span>
                      <span className="text-[11px] opacity-80">{totalWrong}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewFilter("unanswered")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        reviewFilter === "unanswered"
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100"
                      }`}
                    >
                      <span>Chưa làm</span>
                      <span className="text-[11px] opacity-80">{totalUnanswered}</span>
                    </button>
                  </div>
                </div>

                {/* Panel Bảng chuyển nhanh câu hỏi (Question Palette) */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Danh Sách Câu Hỏi
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Bấm để xem nhanh
                    </span>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {detailedList.map((item) => {
                      const isUnans = !item.selected_option_id;
                      const isRight = item.is_correct;

                      let btnColor = "bg-rose-500 hover:bg-rose-600 text-white";
                      if (isRight) {
                        btnColor = "bg-emerald-600 hover:bg-emerald-700 text-white";
                      } else if (isUnans) {
                        btnColor =
                          "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-200";
                      }

                      return (
                        <button
                          key={item.question_id}
                          type="button"
                          onClick={() => scrollToQuestion(item.question_id)}
                          className={`h-9 rounded-xl text-xs font-bold transition flex items-center justify-center ${btnColor}`}
                          title={`Câu ${item.index}: ${isRight ? "Đúng" : isUnans ? "Chưa làm" : "Sai"}`}
                        >
                          {item.index}
                        </button>
                      );
                    })}
                  </div>

                  {/* Chú thích màu sắc */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Đúng ({totalCorrect})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Sai ({totalWrong})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600"></span> Bỏ trống ({totalUnanswered})
                    </span>
                  </div>
                </div>

                {/* Các nút hành động điều hướng */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm space-y-2.5">
                  <Link
                    href="/student"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition text-center"
                  >
                    <span>← Quay về Góc học tập</span>
                  </Link>
                  <Link
                    href="/student/practice/history"
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center text-center"
                  >
                    <span>Xem lịch sử làm bài</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : examResult.waiting_room_finish ? (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 p-8 text-center space-y-3">
              <span className="text-3xl">⏳</span>
              <p className="text-base font-bold text-amber-800 dark:text-amber-300">
                Đang chờ ca thi kết thúc để mở đáp án chi tiết
              </p>
              <p className="text-xs sm:text-sm text-amber-700/90 dark:text-amber-200/80 max-w-xl mx-auto leading-relaxed">
                Phòng thi vẫn đang diễn ra với các thí sinh khác. Đáp án chi tiết và lời giải sẽ tự động mở khóa ngay sau khi Giảng viên kết thúc ca thi hoặc hết giờ làm bài.
              </p>
              <div className="pt-2">
                <Link
                  href="/student"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition"
                >
                  ← Về Góc học tập
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
              <span className="text-3xl">🔒</span>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                Giảng viên không mở xem đáp án chi tiết
              </p>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Điểm số bài thi của bạn đã được lưu an toàn vào hệ thống.
              </p>
              <div className="pt-2">
                <Link
                  href="/student"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition"
                >
                  ← Về Góc học tập
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // MÀN HÌNH CHECK-IN & KIỂM TRA THIẾT BỊ GIÁM SÁT AI (PB12)
  // =========================================================================
  if (!hasCheckedIn && !examResult && !isLocked && roomMeta?.status === "in_progress") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
        {/* Header */}
        <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition text-sm font-bold"
            >
              ←
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white">
                Phòng Thi Trực Tuyến Giám Sát AI
              </h1>
              <p className="text-xs text-slate-400">
                {examMeta?.title} • {examMeta?.subject_name}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            Mã phòng: {roomMeta?.room_code}
          </span>
        </header>

        {/* Body */}
        <main className="max-w-4xl w-full mx-auto my-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Cột Trái: Webcam Live Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              1. Kiểm Tra Webcam Thí Sinh
            </span>
            <WebcamProctorView
              videoRef={webcamProctor.videoRef}
              canvasRef={webcamProctor.canvasRef}
              stream={webcamProctor.stream}
              faceStatus={webcamProctor.faceStatus}
              detectedFaces={webcamProctor.detectedFaces}
              errorMessage={webcamProctor.errorMessage}
              hasCamera={webcamProctor.hasCamera}
              variant="checkin"
            />
          </div>

          {/* Cột Phải: Quy chế phòng thi */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">
                2. Quy Chế Chống Gian Lận Trực Tuyến
              </span>
              <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-base text-emerald-400 shrink-0">🖥️</span>
                  <span>
                    <strong>Toàn Màn Hình bắt buộc:</strong> Bấm bắt đầu sẽ tự động chuyển sang chế độ Fullscreen. Không được bấm ESC thoát ra.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-base text-amber-400 shrink-0">🚫</span>
                  <span>
                    <strong>Cấm Chuyển Tab / Ứng dụng:</strong> Mọi thao tác rời khỏi bài thi (Alt+Tab, phím F12, mở tab khác) đều bị ghi nhận ngay lập tức.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-base text-blue-400 shrink-0">👤</span>
                  <span>
                    <strong>Camera AI theo dõi:</strong> Không rời khỏi ghế, không che webcam, không quay mặt đi nơi khác và không có người thứ hai.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200">
                  <span className="text-base text-red-400 shrink-0">⛔</span>
                  <span>
                    <strong>Đình chỉ thi:</strong> Vi phạm đủ <strong>3 lần</strong> hệ thống sẽ <strong>tự động đình chỉ thi và nộp bài cưỡng chế</strong>!
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={!webcamProctor.hasCamera}
                onClick={handleStartOfficialExam}
                className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg transition ${webcamProctor.hasCamera
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 active:scale-98 cursor-pointer"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70"
                  }`}
              >
                {webcamProctor.hasCamera
                  ? "🚀 Bật Toàn Màn Hình & Bắt Đầu Làm Bài"
                  : "⏳ Đang kết nối camera... Vui lòng cấp quyền"}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                {webcamProctor.hasCamera
                  ? `Thời gian: ${examMeta?.duration_minutes} phút • Gồm ${questions.length} câu hỏi`
                  : "⚠️ Thí sinh phải cho phép trình duyệt truy cập camera để mở khóa bài thi"}
              </p>
            </div>
          </div>
        </main>

        <footer className="max-w-4xl w-full mx-auto text-center text-xs text-slate-400 pb-2">
          Hệ thống khảo thí AI-Quizz 2.0 • Chống gian lận
        </footer>
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

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Huy hiệu đếm số lần vi phạm quy chế phòng thi (PB12) */}
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${violationCount >= 2
                ? "bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-400 animate-pulse"
                : violationCount === 1
                  ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400"
                }`}
              title="Số lần vi phạm quy chế (Tối đa 3 lần sẽ bị đình chỉ thi)"
            >
              <span>{violationCount === 0 ? "✓ Giám sát hợp lệ" : `⚠️ Vi phạm: ${violationCount}/3`}</span>
            </div>

            {/* Nút bật lại toàn màn hình nếu thí sinh lỡ thoát fullscreen */}
            {!isFullscreen && (
              <button
                type="button"
                onClick={requestFullscreen}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                title="Bắt buộc làm bài ở chế độ toàn màn hình"
              >
                <span>⛶</span>
                <span>Toàn màn hình</span>
              </button>
            )}

            {/* Đồng hồ đếm ngược */}
            <div
              className={`px-3 sm:px-4 py-1.5 rounded-xl border font-mono text-base sm:text-lg font-black tracking-tight flex items-center gap-2 ${isDangerTime
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cột trái: Nội dung câu hỏi hiện tại */}
        <section className="lg:col-span-8 flex flex-col justify-between gap-4">
          {currentQuestion ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-6">
              {/* Header câu hỏi */}
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
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${flaggedIds.has(currentQuestion._id)
                    ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-300 font-bold"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                >
                  <span>{flaggedIds.has(currentQuestion._id) ? "⚑" : "⚐"}</span>
                  <span>
                    {flaggedIds.has(currentQuestion._id)
                      ? "Đã đánh dấu xem lại"
                      : "Đánh dấu xem lại"}
                  </span>
                </button>
              </div>

              {/* Nội dung câu hỏi */}
              <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                {currentQuestion.content}
              </div>

              {/* Danh sách các lựa chọn đáp án */}
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
                      className={`w-full text-left rounded-2xl border p-4 transition-all flex items-center gap-3.5 cursor-pointer disabled:cursor-not-allowed ${isSelected
                        ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/25 shadow-xs"
                        : "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/60"
                        }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                      >
                        {opt.option_label}
                      </span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed flex-1">
                        {opt.content}
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 font-bold shadow-xs">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Điều hướng Trước / Sau gắn liền card câu hỏi */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-2xs transition"
                >
                  ← Câu trước
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
                    }
                    className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-bold hover:opacity-90 cursor-pointer shadow-xs transition"
                  >
                    Câu tiếp theo →
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isLocked || submitting}
                    onClick={() => setShowSubmitConfirm(true)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold cursor-pointer shadow-xs transition"
                  >
                    Hoàn tất &amp; Nộp bài ✓
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500">
              Không có câu hỏi nào trong đề thi.
            </div>
          )}
        </section>

        {/* Cột phải: Bảng câu hỏi & Widget Camera AI (Cố định trong Sidebar) */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="sticky top-20 space-y-4">
            {/* Thẻ Bảng Danh Sách Câu Hỏi */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Danh Sách Câu Hỏi
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bấm số câu để chuyển nhanh
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {answeredCount} / {questions.length}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
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
                      className={`relative h-10 rounded-xl border text-xs font-semibold transition cursor-pointer ${btnStyle} ${isCurrent
                        ? "ring-2 ring-slate-900 dark:ring-white ring-offset-1 font-bold"
                        : ""
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
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  <span>Đã làm ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                  <span>Chưa làm ({Math.max(0, questions.length - answeredCount)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  <span>Đánh dấu ({flaggedIds.size})</span>
                </div>
              </div>
            </div>

            {/* Widget Camera Giám Sát AI Cố Định Trong Cột Phụ (PB12 Sidebar Variant) */}
            <WebcamProctorView
              videoRef={webcamProctor.videoRef}
              canvasRef={webcamProctor.canvasRef}
              stream={webcamProctor.stream}
              faceStatus={webcamProctor.faceStatus}
              detectedFaces={webcamProctor.detectedFaces}
              errorMessage={webcamProctor.errorMessage}
              hasCamera={webcamProctor.hasCamera}
              variant="sidebar"
            />
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

      {/* Modal Cảnh Báo Vi Phạm Toàn Màn Hình Khi Vi Phạm Quy Chế (PB12) */}
      <ViolationAlertModal
        isOpen={modalState.isOpen}
        violationType={modalState.type}
        description={modalState.description}
        violationCount={violationCount}
        maxViolations={3}
        evidenceSnapshot={modalState.evidenceSnapshot}
        isRevoked={violationCount >= 3 || isRevoked}
        onConfirmDismiss={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onExitRevokedExam={() => router.push("/student")}
      />
    </div>
  );
}
