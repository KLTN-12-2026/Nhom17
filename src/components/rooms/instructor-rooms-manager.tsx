"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ExamOption {
  _id: string;
  title: string;
  duration_minutes: number;
  total_questions: number;
  max_score: number;
  is_published: boolean;
  subject_id?: {
    _id: string;
    subject_name: string;
  } | null;
}

interface RoomItem {
  _id: string;
  room_code: string;
  status: "waiting" | "in_progress" | "finished";
  start_time: string;
  end_time: string;
  candidates_count: number;
  submitted_count: number;
  createdAt: string;
  exam_id?: {
    _id: string;
    title: string;
    duration_minutes: number;
    total_questions: number;
    max_score: number;
    subject_id?: {
      subject_name: string;
    } | null;
  } | null;
}

interface RoomStats {
  total: number;
  waiting: number;
  in_progress: number;
  finished: number;
}

interface InstructorRoomsManagerProps {
  initialExamId?: string;
}

export default function InstructorRoomsManager({
  initialExamId = "",
}: InstructorRoomsManagerProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [stats, setStats] = useState<RoomStats>({
    total: 0,
    waiting: 0,
    in_progress: 0,
    finished: 0,
  });
  const [publishedExams, setPublishedExams] = useState<ExamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "waiting" | "in_progress" | "finished"
  >("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [roomToDelete, setRoomToDelete] = useState<RoomItem | null>(null);

  // Modal tạo phòng thi
  const [isModalOpen, setIsModalOpen] = useState(Boolean(initialExamId));
  const [selectedExamId, setSelectedExamId] = useState(initialExamId);
  const [customRoomCode, setCustomRoomCode] = useState("");
  const [customDuration, setCustomDuration] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [roomsRes, examsRes] = await Promise.all([
        fetch("/api/instructor/rooms"),
        fetch("/api/instructor/exams?status=published"),
      ]);
      const roomsData = await roomsRes.json();
      const examsData = await examsRes.json();

      if (roomsData.success) {
        setRooms(roomsData.rooms || []);
        if (roomsData.stats) setStats(roomsData.stats);
      }
      if (examsData.success && Array.isArray(examsData.exams)) {
        setPublishedExams(examsData.exams);
        if (initialExamId) {
          const matched = examsData.exams.find(
            (e: ExamOption) => e._id === initialExamId
          );
          if (matched) {
            setSelectedExamId(matched._id);
            setCustomDuration(String(matched.duration_minutes));
          }
        } else if (examsData.exams.length > 0) {
          setSelectedExamId((prev) => prev || examsData.exams[0]._id);
          setCustomDuration(
            (prev) => prev || String(examsData.exams[0].duration_minutes)
          );
        }
      }
    } catch {
      setErrorMsg("Không thể tải dữ liệu phòng thi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [initialExamId]);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetch("/api/instructor/rooms").then((res) => res.json()),
      fetch("/api/instructor/exams?status=published").then((res) => res.json()),
    ])
      .then(([roomsData, examsData]) => {
        if (ignore) return;
        if (roomsData.success) {
          setRooms(roomsData.rooms || []);
          if (roomsData.stats) setStats(roomsData.stats);
        }
        if (examsData.success && Array.isArray(examsData.exams)) {
          setPublishedExams(examsData.exams);
          if (initialExamId) {
            const matched = examsData.exams.find(
              (e: ExamOption) => e._id === initialExamId
            );
            if (matched) {
              setSelectedExamId(matched._id);
              setCustomDuration(String(matched.duration_minutes));
            }
          } else if (examsData.exams.length > 0) {
            setSelectedExamId((prev) => prev || examsData.exams[0]._id);
            setCustomDuration(
              (prev) => prev || String(examsData.exams[0].duration_minutes)
            );
          }
        }
      })
      .catch(() => {
        if (!ignore) {
          setErrorMsg("Không thể tải dữ liệu phòng thi. Vui lòng thử lại.");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [initialExamId]);

  const filteredRooms = useMemo(() => {
    if (statusFilter === "all") return rooms;
    return rooms.filter((r) => r.status === statusFilter);
  }, [rooms, statusFilter]);

  const handleSelectExamChange = (examId: string) => {
    setSelectedExamId(examId);
    const matched = publishedExams.find((e) => e._id === examId);
    if (matched) {
      setCustomDuration(String(matched.duration_minutes));
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!selectedExamId) {
      setCreateError("Vui lòng chọn một đề thi đã xuất bản.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/instructor/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: selectedExamId,
          room_code: customRoomCode.trim() || undefined,
          duration_minutes: customDuration ? Number(customDuration) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreateError(data.message || "Không thể tạo phòng thi.");
        return;
      }

      setIsModalOpen(false);
      setCustomRoomCode("");
      if (data.room?._id) {
        router.push(`/instructor/rooms/${data.room._id}`);
      } else {
        await loadData();
      }
    } catch {
      setCreateError("Lỗi kết nối máy chủ khi tạo phòng thi.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyInvite = async (room: RoomItem, mode: "code" | "link") => {
    const text =
      mode === "code"
        ? room.room_code
        : `${window.location.origin}/student/join-room?room_code=${encodeURIComponent(
            room.room_code
          )}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(`${room._id}_${mode}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDeleteRoom = async (room: RoomItem) => {
    setDeletingId(room._id);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/instructor/rooms/${room._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Không thể xóa phòng thi.");
        return;
      }
      setRoomToDelete(null);
      await loadData();
    } catch {
      setErrorMsg("Lỗi kết nối khi xóa phòng thi.");
    } finally {
      setDeletingId(null);
    }
  };

  const statusBadge = (status: RoomItem["status"]) => {
    if (status === "waiting") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Phòng chờ
        </span>
      );
    }
    if (status === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          Đang thi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Đã kết thúc
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Thống kê tổng quan */}
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800">
          <div className="p-4 sm:p-5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Tổng số phòng thi
            </span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {stats.total}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Đang chờ bắt đầu
            </span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {stats.waiting}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Đang diễn ra (Live)
            </span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {stats.in_progress}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Đã kết thúc
            </span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {stats.finished}
            </div>
          </div>
        </div>
      </div>

      {/* Thanh bộ lọc & nút tạo mới */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 self-start">
          {(
            [
              { key: "all", label: "Tất cả" },
              { key: "waiting", label: "Phòng chờ" },
              { key: "in_progress", label: "Đang thi" },
              { key: "finished", label: "Đã kết thúc" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError("");
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs hover:opacity-90 transition cursor-pointer shadow-xs"
        >
          <span>+</span>
          <span>Mở Phòng Thi Mới</span>
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Danh sách phòng thi */}
      {loading ? (
        <div className="py-16 text-center border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
          <div className="inline-block w-7 h-7 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-slate-500">Đang tải danh sách phòng thi...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 px-4">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Chưa có phòng thi nào trong mục này
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
            Tạo phòng thi trực tuyến từ đề thi đã xuất bản để cấp mã PIN cho học viên tham gia phòng chờ và làm bài đồng bộ.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
          >
            <span>+ Tạo phòng thi ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const exam = room.exam_id;
            const durationMin = Math.max(
              1,
              Math.round(
                (new Date(room.end_time).getTime() -
                  new Date(room.start_time).getTime()) /
                  60000
              )
            );

            return (
              <div
                key={room._id}
                className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => handleCopyInvite(room, "code")}
                      title="Bấm để sao chép mã phòng"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white dark:bg-slate-800 dark:text-white font-mono font-bold text-xs tracking-wider cursor-pointer hover:opacity-90 transition"
                    >
                      <span>{room.room_code}</span>
                      <span className="text-[10px] font-sans font-normal text-slate-300">
                        {copiedId === `${room._id}_code` ? "✓ Đã chép" : "Copy"}
                      </span>
                    </button>

                    {statusBadge(room.status)}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1.5">
                    {exam?.title || "Đề thi đã bị xóa"}
                  </h3>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                    {exam?.subject_id?.subject_name || "Chuyên đề chung"} •{" "}
                    {exam?.total_questions || 0} câu •{" "}
                    {room.status === "waiting"
                      ? `${durationMin} phút`
                      : `${exam?.duration_minutes || durationMin} phút`}
                  </p>

                  <div className="grid grid-cols-2 gap-2 py-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center text-xs mb-4">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        Thí sinh vào phòng
                      </span>
                      <strong className="text-slate-900 dark:text-white font-bold">
                        {room.candidates_count}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        Đã nộp bài
                      </span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {room.submitted_count}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/instructor/rooms/${room._id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                    >
                      <span>
                        {room.status === "finished"
                          ? "Xem kết quả"
                          : "Điều phối Live"}
                      </span>
                      <span>→</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleCopyInvite(room, "link")}
                      title="Sao chép đường dẫn tham gia cho học viên"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      {copiedId === `${room._id}_link` ? "✓ Đã chép link" : "Link mời"}
                    </button>
                  </div>

                  {room.status !== "in_progress" && (
                    <button
                      type="button"
                      disabled={deletingId === room._id}
                      onClick={() => setRoomToDelete(room)}
                      title="Xóa phòng thi"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.75"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal tạo phòng thi mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Mở Phòng Thi Trực Tuyến Mới
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn đề thi đã xuất bản để phát hành mã phòng cho học viên
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="p-6 space-y-4">
              {publishedExams.length === 0 ? (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                  <p className="font-semibold">
                    Chưa có đề thi nào ở trạng thái &ldquo;Đã xuất bản&rdquo;.
                  </p>
                  <p>
                    Vui lòng vào mục Quản lý đề thi và bật xuất bản ít nhất 1 đề thi trước khi mở phòng.
                  </p>
                  <Link
                    href="/instructor/exams"
                    className="inline-block font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Đi tới Quản lý đề thi →
                  </Link>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Chọn đề thi
                    </label>
                    <select
                      value={selectedExamId}
                      onChange={(e) => handleSelectExamChange(e.target.value)}
                      required
                      className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    >
                      {publishedExams.map((exam) => (
                        <option key={exam._id} value={exam._id}>
                          {exam.title} ({exam.total_questions} câu •{" "}
                          {exam.duration_minutes} phút)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Mã phòng (Tuỳ chọn)
                      </label>
                      <input
                        type="text"
                        value={customRoomCode}
                        onChange={(e) =>
                          setCustomRoomCode(e.target.value.toUpperCase())
                        }
                        placeholder="Để trống để tự sinh (VD: PQP839)"
                        maxLength={20}
                        className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs sm:text-sm font-mono font-bold uppercase text-slate-900 dark:text-white outline-none focus:border-blue-500 placeholder:font-sans placeholder:font-normal placeholder:normal-case"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Thời lượng làm bài (Phút)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={480}
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        required
                        className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Lưu ý: Ca thi áp dụng đồng hồ đồng bộ theo giờ máy chủ từ lúc bạn bấm Phát đề cho tất cả thí sinh. Học viên vào muộn sẽ có thời gian còn lại ít hơn theo mốc kết thúc chung của phòng.
                  </p>
                </>
              )}

              {createError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
                  {createError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                {publishedExams.length > 0 && (
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-blue-600 text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? "Đang khởi tạo..." : "Tạo Phòng Thi"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa phòng thi */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xác nhận xóa phòng thi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thao tác này sẽ xóa phòng thi khỏi hệ thống
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã phòng:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{roomToDelete.room_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tên đề thi:</span>
                <span className="font-semibold text-slate-900 dark:text-white text-right max-w-[220px] truncate">
                  {roomToDelete.exam_id?.title || "Đề thi"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {roomToDelete.status === "finished" ? "Đã kết thúc" : "Phòng chờ"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số bài đã nộp:</span>
                <span className="font-bold text-slate-900 dark:text-white">{roomToDelete.submitted_count} bài</span>
              </div>
            </div>

            {roomToDelete.submitted_count > 0 ? (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-xs text-rose-700 dark:text-rose-300 leading-relaxed mb-5">
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <span>⚠️ Cảnh báo dữ liệu:</span>
                </div>
                Phòng thi này đã có <strong>{roomToDelete.submitted_count} lượt nộp bài</strong> của thí sinh. Khi xóa, toàn bộ kết quả thi, bảng điểm và ảnh chụp bằng chứng giám sát AI của ca thi này sẽ bị xóa vĩnh viễn và không thể khôi phục.
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                Phòng thi chưa có thí sinh nào nộp bài. Bạn có chắc chắn muốn xóa phòng thi này không?
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setRoomToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => handleDeleteRoom(roomToDelete)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingId ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <span>Xác nhận xóa</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
