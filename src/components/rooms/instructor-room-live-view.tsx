"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface CandidateRecord {
  _id?: string;
  user_id: {
    _id: string;
    name: string;
    email: string;
  } | null;
  joined_at: string;
  connection_status: "connected" | "disconnected" | "submitted";
}

interface StudentAttemptInfo {
  attempt_id: string;
  status: "in_progress" | "submitted" | "revoked" | "timed_out";
  answered_count: number;
  total_questions: number;
  score: number;
  total_correct: number;
  total_wrong: number;
  start_time: string;
  submit_time: string | null;
  duration_seconds: number;
}

interface RoomDetail {
  _id: string;
  room_code: string;
  status: "waiting" | "in_progress" | "finished";
  start_time: string;
  end_time: string;
  candidates: CandidateRecord[];
  exam_id?: {
    _id: string;
    title: string;
    duration_minutes: number;
    total_questions: number;
    max_score: number;
    pass_score: number;
    subject_id?: {
      subject_name: string;
    } | null;
  } | null;
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

export default function InstructorRoomLiveView({
  roomId,
}: {
  roomId: string;
}) {
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [attemptsByStudent, setAttemptsByStudent] = useState<
    Record<string, StudentAttemptInfo>
  >({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedType, setCopiedType] = useState<"code" | "link" | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const applyRoomPayload = useCallback(
    (data: {
      room: RoomDetail;
      attemptsByStudent?: Record<string, StudentAttemptInfo>;
      server_now?: string;
    }) => {
      setRoom(data.room);
      setAttemptsByStudent(data.attemptsByStudent || {});
      if (data.server_now) {
        const offset = new Date(data.server_now).getTime() - Date.now();
        setServerOffsetMs(offset);
        if (data.room.status === "in_progress") {
          setRemainingSeconds(
            Math.max(
              0,
              Math.floor(
                (new Date(data.room.end_time).getTime() -
                  new Date(data.server_now).getTime()) /
                  1000
              )
            )
          );
        }
      }
    },
    []
  );

  const fetchRoomState = useCallback(async () => {
    try {
      const res = await fetch(`/api/instructor/rooms/${roomId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Không thể tải dữ liệu phòng thi");
        return;
      }
      applyRoomPayload(data);
    } catch {
      setErrorMsg("Mất kết nối tạm thời với máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [roomId, applyRoomPayload]);

  const roomStatus = room?.status;

  // Tải lần đầu + polling đồng bộ mỗi 2 giây khi phòng chưa kết thúc
  useEffect(() => {
    let ignore = false;

    const loadOnce = () => {
      fetch(`/api/instructor/rooms/${roomId}`, { cache: "no-store" })
        .then(async (res) => ({ ok: res.ok, data: await res.json() }))
        .then(({ ok, data }) => {
          if (ignore) return;
          if (!ok || !data.success) {
            setErrorMsg(data.message || "Không thể tải dữ liệu phòng thi");
            return;
          }
          applyRoomPayload(data);
        })
        .catch(() => {
          if (!ignore) {
            setErrorMsg("Mất kết nối tạm thời với máy chủ.");
          }
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    };

    loadOnce();
    const interval = setInterval(() => {
      if (roomStatus !== "finished") {
        loadOnce();
      }
    }, 2000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [roomId, roomStatus, applyRoomPayload]);

  // Đồng hồ đếm ngược thời gian thực khi phòng đang thi
  useEffect(() => {
    if (!room || room.status !== "in_progress") return;

    const updateTimer = () => {
      const nowServerMs = Date.now() + serverOffsetMs;
      const diffSec = Math.max(
        0,
        Math.floor((new Date(room.end_time).getTime() - nowServerMs) / 1000)
      );
      setRemainingSeconds(diffSec);
    };

    const timer = setInterval(updateTimer, 500);
    return () => clearInterval(timer);
  }, [room, serverOffsetMs]);

  const handleRoomAction = async (action: "start" | "finish") => {
    if (action === "finish") {
      const ok = window.confirm(
        "Xác nhận kết thúc ca thi? Toàn bộ bài thi đang làm dở sẽ tự động được thu và chấm điểm ngay lập tức."
      );
      if (!ok) return;
    }

    setActionLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/instructor/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Không thể thực hiện thao tác.");
        return;
      }
      await fetchRoomState();
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ khi điều khiển phòng thi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = async (type: "code" | "link") => {
    if (!room) return;
    const text =
      type === "code"
        ? room.room_code
        : `${window.location.origin}/student/join-room?room_code=${encodeURIComponent(
            room.room_code
          )}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500">Đang kết nối phòng điều phối trực tuyến...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4">
        <p className="text-sm font-bold text-rose-600 mb-3">
          {errorMsg || "Không tìm thấy phòng thi."}
        </p>
        <Link
          href="/instructor/rooms"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
        >
          ← Quay lại danh sách phòng thi
        </Link>
      </div>
    );
  }

  const exam = room.exam_id;
  const totalQuestions = exam?.total_questions || 0;
  const candidates = room.candidates || [];
  const submittedCount = candidates.filter((c) => {
    const uid = c.user_id?._id ? String(c.user_id._id) : "";
    const att = uid ? attemptsByStudent[uid] : undefined;
    return (
      c.connection_status === "submitted" ||
      att?.status === "submitted" ||
      att?.status === "timed_out"
    );
  }).length;

  const displayedSeconds =
    room.status === "waiting"
      ? Math.max(
          60,
          Math.round(
            (new Date(room.end_time).getTime() -
              new Date(room.start_time).getTime()) /
              1000
          )
        )
      : room.status === "in_progress"
      ? remainingSeconds
      : 0;

  return (
    <div className="space-y-6">
      {/* Banner điều phối phòng thi */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 border border-slate-800 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/instructor/rooms"
                className="text-xs font-medium text-slate-300 hover:text-white transition"
              >
                ← Danh sách phòng
              </Link>
              <span className="text-slate-600">/</span>
              {room.status === "waiting" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Đang mở phòng chờ thí sinh
                </span>
              )}
              {room.status === "in_progress" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Ca thi đang diễn ra (Live)
                </span>
              )}
              {room.status === "finished" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                  Đã kết thúc ca thi
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {exam?.title || "Đề thi trực tuyến"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {exam?.subject_id?.subject_name || "Chuyên đề"} • {totalQuestions}{" "}
              câu hỏi • Thang điểm {exam?.max_score || 10}
            </p>

            {/* Mã phòng & Link mời */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15">
                <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                  Mã PIN:
                </span>
                <span className="font-mono text-lg sm:text-xl font-black tracking-widest text-amber-300">
                  {room.room_code}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("code")}
                  className="ml-1 px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-[11px] font-semibold cursor-pointer transition"
                >
                  {copiedType === "code" ? "✓ Đã chép" : "Copy mã"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleCopy("link")}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold transition cursor-pointer"
              >
                {copiedType === "link"
                  ? "✓ Đã sao chép đường dẫn vào phòng"
                  : "🔗 Sao chép link tham gia"}
              </button>
            </div>
          </div>

          {/* Đồng hồ & Nút điều phối chính */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
            <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[170px]">
              <span className="block text-[10px] uppercase tracking-wider text-slate-300 font-semibold">
                {room.status === "waiting"
                  ? "Thời lượng dự kiến"
                  : room.status === "in_progress"
                  ? "Thời gian còn lại"
                  : "Trạng thái thời gian"}
              </span>
              <span
                className={`font-mono text-2xl sm:text-3xl font-black tracking-tight ${
                  room.status === "in_progress" && displayedSeconds <= 60
                    ? "text-rose-400 animate-pulse"
                    : "text-white"
                }`}
              >
                {room.status === "finished"
                  ? "00:00"
                  : formatCountdown(displayedSeconds)}
              </span>
            </div>

            {room.status === "waiting" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRoomAction("start")}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition cursor-pointer disabled:opacity-60"
              >
                {actionLoading
                  ? "Đang phát đề..."
                  : "▶ Phát Đề & Bắt Đầu Tính Giờ"}
              </button>
            )}

            {room.status === "in_progress" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRoomAction("finish")}
                className="px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-500/25 transition cursor-pointer disabled:opacity-60"
              >
                {actionLoading
                  ? "Đang thu bài..."
                  : "■ Thu Bài & Kết Thúc Ca Thi"}
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Bảng thí sinh thời gian thực */}
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Danh Sách Thí Sinh Trong Phòng ({candidates.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động cập nhật trạng thái kết nối và số câu đã hoàn thành mỗi 2 giây
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              Đã nộp: {submittedCount} / {candidates.length}
            </span>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="py-16 text-center px-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Chưa có thí sinh nào tham gia phòng thi
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy chia sẻ mã PIN{" "}
              <strong className="font-mono text-slate-900 dark:text-white">
                {room.room_code}
              </strong>{" "}
              hoặc đường dẫn mời cho học viên để họ vào phòng chờ.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Học viên</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Tiến độ làm bài</th>
                  <th className="px-5 py-3 text-right">Điểm số</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {candidates.map((cand, idx) => {
                  const u = cand.user_id;
                  const uid = u?._id ? String(u._id) : String(idx);
                  const attempt = u?._id ? attemptsByStudent[String(u._id)] : undefined;

                  const isFinishedAttempt =
                    attempt?.status === "submitted" ||
                    attempt?.status === "timed_out" ||
                    cand.connection_status === "submitted";

                  const qTotal = attempt?.total_questions || totalQuestions;
                  const answered = attempt?.answered_count || 0;
                  const pct =
                    qTotal > 0 ? Math.round((answered / qTotal) * 100) : 0;

                  return (
                    <tr
                      key={uid}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
                    >
                      <td className="px-5 py-3.5 text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {u?.name || "Học viên"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {u?.email || ""}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {isFinishedAttempt ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                            ✓ {attempt?.status === "timed_out" ? "Hết giờ (Đã thu)" : "Đã nộp bài"}
                          </span>
                        ) : cand.connection_status === "disconnected" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Mất kết nối
                          </span>
                        ) : attempt?.status === "in_progress" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Đang làm bài
                          </span>
                        ) : room.status === "waiting" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Sẵn sàng tại phòng chờ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Chưa vào đề
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 min-w-[160px]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isFinishedAttempt
                                  ? "bg-emerald-500"
                                  : "bg-blue-600"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 w-14 text-right">
                            {answered}/{qTotal}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold">
                        {isFinishedAttempt && attempt ? (
                          <span
                            className={
                              attempt.score >= (exam?.pass_score || 5)
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {attempt.score} / {exam?.max_score || 10}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
