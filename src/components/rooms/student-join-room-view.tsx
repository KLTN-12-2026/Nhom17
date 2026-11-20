"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface WaitingRoomData {
  _id: string;
  room_code: string;
  status: "waiting" | "in_progress" | "finished";
  start_time: string;
  end_time: string;
  teacher_id?: { name: string } | null;
  exam_id?: {
    _id: string;
    title: string;
    duration_minutes: number;
    total_questions: number;
    max_score: number;
    pass_score: number;
    subject_id?: { subject_name: string } | null;
  } | null;
  candidates_count?: number;
  online_count?: number;
}

interface StudentJoinRoomViewProps {
  initialRoomCode?: string;
  initialRoomId?: string;
  currentUserName?: string | null;
}

export default function StudentJoinRoomView({
  initialRoomCode = "",
  initialRoomId = "",
  currentUserName = "",
}: StudentJoinRoomViewProps) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [joining, setJoining] = useState(
    Boolean(initialRoomCode.trim() && !initialRoomId)
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [activeRoomId, setActiveRoomId] = useState<string>(initialRoomId);
  const [waitingRoom, setWaitingRoom] = useState<WaitingRoomData | null>(null);

  const joinByCode = useCallback(
    async (codeToJoin: string) => {
      const normalized = codeToJoin.trim().toUpperCase();
      if (!normalized) {
        setErrorMsg("Vui lòng nhập mã phòng thi do giảng viên cung cấp.");
        return;
      }

      setJoining(true);
      setErrorMsg("");
      try {
        const res = await fetch("/api/student/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_code: normalized }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setErrorMsg(
            data.message || "Không thể tham gia phòng thi. Vui lòng kiểm tra mã phòng."
          );
          return;
        }

        if (data.already_submitted || data.room_status === "in_progress") {
          router.push(`/student/exam/${data.room_id}`);
          return;
        }

        setActiveRoomId(data.room_id);
        setWaitingRoom(data.room || null);
      } catch {
        setErrorMsg("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
      } finally {
        setJoining(false);
      }
    },
    [router]
  );

  // Tự động tham gia nếu URL truyền sẵn ?room_code=...
  useEffect(() => {
    const code = initialRoomCode.trim().toUpperCase();
    if (!code || initialRoomId) return;

    let ignore = false;
    fetch("/api/student/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_code: code }),
    })
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (ignore) return;
        if (!ok || !data.success) {
          setErrorMsg(
            data.message ||
              "Không thể tham gia phòng thi. Vui lòng kiểm tra mã phòng."
          );
          return;
        }
        if (data.already_submitted || data.room_status === "in_progress") {
          router.push(`/student/exam/${data.room_id}`);
          return;
        }
        setActiveRoomId(data.room_id);
        setWaitingRoom(data.room || null);
      })
      .catch(() => {
        if (!ignore) {
          setErrorMsg("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
        }
      })
      .finally(() => {
        if (!ignore) setJoining(false);
      });

    return () => {
      ignore = true;
    };
  }, [initialRoomCode, initialRoomId, router]);

  // Đồng bộ trạng thái phòng chờ mỗi 2 giây
  useEffect(() => {
    if (!activeRoomId) return;

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/student/rooms/${activeRoomId}/status`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok || !data.success) {
          setErrorMsg(data.message || "Phòng thi không còn khả dụng.");
          setActiveRoomId("");
          setWaitingRoom(null);
          return;
        }

        const r: WaitingRoomData = data.room;
        setWaitingRoom(r);

        if (r.status === "in_progress") {
          router.push(`/student/exam/${r._id}`);
          return;
        }

        if (r.status === "finished") {
          if (data.my_attempt) {
            router.push(`/student/exam/${r._id}`);
          } else {
            setErrorMsg("Ca thi này đã kết thúc.");
            setActiveRoomId("");
            setWaitingRoom(null);
          }
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời giữa các lần poll
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeRoomId, router]);

  // Gửi tín hiệu ngắt kết nối khi đóng tab tại phòng chờ
  useEffect(() => {
    if (!activeRoomId) return;

    const handlePageHide = () => {
      try {
        const blob = new Blob([JSON.stringify({ action: "disconnect" })], {
          type: "application/json",
        });
        navigator.sendBeacon(`/api/student/rooms/${activeRoomId}/status`, blob);
      } catch {
        // Ignore beacon errors
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [activeRoomId]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    joinByCode(roomCode);
  };

  // GIAO DIỆN PHÒNG CHỜ TRỰC TUYẾN (WAITING LOBBY)
  if (activeRoomId && waitingRoom) {
    const exam = waitingRoom.exam_id;
    const totalCandidates = waitingRoom.candidates_count ?? 1;
    const onlineCandidates = waitingRoom.online_count ?? totalCandidates;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Phòng Chờ Trực Tuyến • Đã Kết Nối
              </span>

              <span className="px-3 py-1 rounded-lg bg-white/10 font-mono text-xs font-bold tracking-widest text-white">
                MÃ PHÒNG: {waitingRoom.room_code}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                {exam?.title || "Đề thi trực tuyến"}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300">
                {exam?.subject_id?.subject_name || "Chuyên đề chung"} • Giảng viên:{" "}
                <strong className="text-white">
                  {waitingRoom.teacher_id?.name || "Giảng viên"}
                </strong>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-2xl bg-white/10 border border-white/10 p-3.5 text-center">
                <span className="block text-[11px] text-slate-300">Thời lượng</span>
                <strong className="text-lg sm:text-xl font-black text-white">
                  {exam?.duration_minutes || 45} phút
                </strong>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 p-3.5 text-center">
                <span className="block text-[11px] text-slate-300">Số câu hỏi</span>
                <strong className="text-lg sm:text-xl font-black text-white">
                  {exam?.total_questions || 0} câu
                </strong>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 p-3.5 text-center">
                <span className="block text-[11px] text-slate-300">Thang điểm</span>
                <strong className="text-lg sm:text-xl font-black text-emerald-300">
                  {exam?.max_score || 10} điểm
                </strong>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/25 p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-300 border-t-transparent animate-spin shrink-0" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold text-emerald-200">
                  Xin chào {currentUserName || "bạn"}, hệ thống đang chờ Giảng viên phát lệnh bắt đầu!
                </p>
                <p className="text-emerald-100/80 text-xs mt-0.5">
                  Vui lòng giữ nguyên cửa sổ này. Thời gian làm bài được tính đồng bộ theo giờ máy chủ từ lúc Giảng viên phát đề.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trạng thái phòng chờ (bảo mật danh tính các thí sinh khác) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-200/60 dark:border-emerald-800/60">
                {onlineCandidates}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {onlineCandidates} thí sinh đang trực tuyến trong phòng chờ
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tổng số thí sinh đã ghi danh ca thi: {totalCandidates}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveRoomId("");
                setWaitingRoom(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition cursor-pointer"
            >
              Đổi mã phòng khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  // GIAO DIỆN NHẬP MÃ PHÒNG THI
  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-200/60 dark:border-emerald-800/60">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Tham Gia Phòng Thi Trực Tuyến
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Nhập mã phòng (Room Code) do giảng viên cung cấp để vào phòng chờ đồng bộ hoặc bắt đầu làm bài thi ngay.
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Mã phòng thi (Room Code)
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                if (errorMsg) setErrorMsg("");
              }}
              placeholder="Ví dụ: PQP839"
              maxLength={20}
              required
              className="h-13 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 px-4 text-center font-mono text-lg font-black tracking-widest uppercase text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
            />
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs sm:text-sm text-rose-700 dark:text-rose-300"
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={joining}
            className="h-12 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-60"
          >
            {joining ? "Đang kiểm tra & vào phòng..." : "Vào Phòng Thi →"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Tự động lưu đáp án mỗi khi bạn chọn để tránh mất bài khi rớt mạng.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Mỗi học viên chỉ được nộp bài 1 lần duy nhất cho mỗi ca thi.</span>
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/student"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            ← Quay về Góc học tập
          </Link>
        </div>
      </div>
    </div>
  );
}
