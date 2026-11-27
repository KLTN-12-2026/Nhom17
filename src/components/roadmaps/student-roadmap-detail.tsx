"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RoadmapExamRunner from "@/components/roadmaps/roadmap-exam-runner";

interface RoadmapContent {
  _id: string;
  content_type: "exam" | "practice" | "lesson";
  title: string;
  order: number;
  exam_id: string | null;
  topic_id: string | null;
  topic_name: string;
  exam_name: string;
  resource_url: string;
  file_name: string;
  completed: boolean;
}

interface RoadmapDetailData {
  _id: string;
  title: string;
  subject_id: string;
  subject_name: string;
  description: string;
  price: number;
  cover_image: string;
  contents: RoadmapContent[];
  content_count: number;
  progress_content_count: number;
  completion_percentage: number;
}

interface AccessError {
  code: "ENROLLMENT_REQUIRED" | "PAYMENT_REQUIRED" | string;
  message: string;
  roadmap?: { title: string; price: number; cover_image: string };
}

function contentTypeLabel(type: RoadmapContent["content_type"]) {
  if (type === "exam") return "Đề thi thử";
  if (type === "practice") return "Bài tự luyện";
  return "Bài giảng / tài liệu";
}

export default function StudentRoadmapDetail({
  roadmapId,
}: {
  roadmapId: string;
}) {
  const [roadmap, setRoadmap] = useState<RoadmapDetailData | null>(null);
  const [accessError, setAccessError] = useState<AccessError | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [updatingContentId, setUpdatingContentId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/student/roadmaps/${roadmapId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          if (
            !ignore &&
            (data.code === "ENROLLMENT_REQUIRED" ||
              data.code === "PAYMENT_REQUIRED")
          ) {
            setAccessError({
              code: data.code,
              message: data.message,
              roadmap: data.roadmap,
            });
            return;
          }
          throw new Error(data.message || "Không thể tải lộ trình.");
        }
        if (!ignore) {
          setRoadmap(data.roadmap);
          setAccessError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!ignore) {
          setError(
            cause instanceof Error ? cause.message : "Không thể tải lộ trình.",
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [roadmapId, reloadKey]);

  const completedCount = useMemo(
    () => roadmap?.contents.filter((content) => content.completed).length || 0,
    [roadmap],
  );

  async function enroll() {
    setJoining(true);
    setError("");
    try {
      const response = await fetch(
        `/api/student/roadmaps/${roadmapId}/enroll`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể tham gia lộ trình.");
      }
      setAccessError(null);
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tham gia lộ trình.",
      );
    } finally {
      setJoining(false);
    }
  }

  async function toggleCompletion(content: RoadmapContent) {
    setUpdatingContentId(content._id);
    setError("");
    try {
      const response = await fetch(`/api/student/roadmaps/${roadmapId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: content._id,
          completed: !content.completed,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể cập nhật tiến độ.");
      }
      setRoadmap((current) =>
        current
          ? {
              ...current,
              completion_percentage: data.completion_percentage,
              contents: current.contents.map((item) =>
                item._id === content._id
                  ? { ...item, completed: !content.completed }
                  : item,
              ),
            }
          : current,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể cập nhật tiến độ.",
      );
    } finally {
      setUpdatingContentId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        Đang tải lộ trình...
      </div>
    );
  }

  if (accessError && !roadmap) {
    const isFreeJoin = accessError.code === "ENROLLMENT_REQUIRED";
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-2xl text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {isFreeJoin ? "↗" : "🔒"}
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
          {isFreeJoin ? "Lộ trình miễn phí" : "Lộ trình có thu phí"}
        </p>
        <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
          {accessError.roadmap?.title || "Chưa thể mở nội dung"}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          {accessError.message}
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-600">
            {error}
          </p>
        )}
        {isFreeJoin && (
          <button
            type="button"
            disabled={joining}
            onClick={() => void enroll()}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {joining ? "Đang đăng ký..." : "Tham gia miễn phí"}
          </button>
        )}
        {!isFreeJoin && (
          <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Giá lộ trình:{" "}
            {new Intl.NumberFormat("vi-VN").format(
              accessError.roadmap?.price || 0,
            )}{" "}
            ₫. Thanh toán trực tuyến chưa được kết nối.
          </p>
        )}
        <Link
          href="/student/roadmaps"
          className="mt-6 inline-flex rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  if (error && !roadmap) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
        <p role="alert">{error}</p>
        <Link
          href="/student/roadmaps"
          className="mt-3 inline-block font-semibold underline"
        >
          Quay lại danh sách lộ trình
        </Link>
      </div>
    );
  }

  if (!roadmap) return null;

  return (
    <div className="space-y-5">
      <Link
        href="/student/roadmaps"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-700 dark:hover:text-indigo-300"
      >
        <span aria-hidden="true">←</span> Tất cả lộ trình
      </Link>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {error}
        </div>
      )}

      <section
        className="relative min-h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-700 bg-cover bg-center p-6 text-white sm:p-8"
        style={
          roadmap.cover_image
            ? { backgroundImage: `url("${roadmap.cover_image}")` }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur">
            Lộ trình học tập
          </span>
          {roadmap.subject_name && (
            <span className="ml-2 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold backdrop-blur">
              {roadmap.subject_name}
            </span>
          )}
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            {roadmap.title}
          </h2>
          {roadmap.description && (
            <p className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-6 text-white/85">
              {roadmap.description}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-white/80">
            <span>{roadmap.content_count} nội dung</span>
            <span>{completedCount} nội dung đã hoàn thành</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Tiến độ tổng thể
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {roadmap.completion_percentage}%
            </p>
          </div>
          <p className="text-right text-xs text-slate-500">
            {roadmap.progress_content_count > 0
              ? `${completedCount} / ${roadmap.progress_content_count} nội dung cần hoàn thành`
              : "Không có nội dung cần đánh dấu hoàn thành"}
          </p>
        </div>
        <div
          className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={roadmap.completion_percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tiến độ lộ trình"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 transition-all duration-500"
            style={{
              width: `${Math.min(100, roadmap.completion_percentage)}%`,
            }}
          />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Nội dung lộ trình
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Hoàn thành nội dung theo thứ tự hoặc quay lại ôn tập bất cứ lúc nào.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:divide-slate-800">
          {roadmap.contents.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              Lộ trình chưa có nội dung.
            </p>
          ) : (
            roadmap.contents.map((content) => (
                    <article
                      key={content._id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5"
                    >
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                          content.completed
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {content.content_type === "exam"
                          ? "ĐT"
                          : content.content_type === "practice"
                            ? "TL"
                            : "BG"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                          {content.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {contentTypeLabel(content.content_type)}
                          {content.topic_name
                            ? ` · ${content.topic_name}`
                            : ""}
                          {content.file_name ? ` · ${content.file_name}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {content.content_type === "exam" && content.exam_id && (
                          <button
                            type="button"
                            onClick={() => setActiveExamId(content.exam_id)}
                            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Bắt đầu thi
                          </button>
                        )}
                        {content.content_type === "practice" && (
                          <Link
                            href={
                              content.topic_id
                                ? `/student/practice?topic_id=${encodeURIComponent(content.topic_id)}&subject_id=${encodeURIComponent(roadmap.subject_id)}`
                                : "/student/practice"
                            }
                            className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                          >
                            Đến khu tự luyện
                          </Link>
                        )}
                        {content.content_type === "lesson" &&
                          content.resource_url && (
                            <>
                              <a
                                href={content.resource_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                              >
                                Xem tài liệu
                              </a>
                              <a
                                href={
                                  content.resource_url.startsWith(
                                    `/api/student/roadmaps/${roadmapId}/materials/`,
                                  )
                                    ? `${content.resource_url}?download=1`
                                    : content.resource_url
                                }
                                download={content.file_name || undefined}
                                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                              >
                                Tải xuống
                              </a>
                            </>
                          )}
                        {content.content_type !== "lesson" && (
                          <button
                            type="button"
                            disabled={updatingContentId === content._id}
                            onClick={() => void toggleCompletion(content)}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                              content.completed
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                          >
                            {updatingContentId === content._id
                              ? "Đang lưu..."
                              : content.completed
                                ? "Đã hoàn thành"
                                : "Đánh dấu hoàn thành"}
                          </button>
                        )}
                      </div>
                    </article>
            ))
          )}
        </div>
      </section>
      {activeExamId && (
        <RoadmapExamRunner
          key={activeExamId}
          roadmapId={roadmapId}
          examId={activeExamId}
          onClose={() => setActiveExamId(null)}
        />
      )}
    </div>
  );
}
