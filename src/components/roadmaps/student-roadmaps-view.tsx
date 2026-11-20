"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface StudentRoadmap {
  _id: string;
  title: string;
  description: string;
  subject_name: string;
  price: number;
  cover_image: string;
  teacher_name: string;
  content_count: number;
  is_enrolled: boolean;
  has_access: boolean;
  can_start: boolean;
  completion_percentage: number;
}

type RoadmapFilter = "all" | "learning" | "free";

function formatPrice(price: number) {
  return price === 0
    ? "Miễn phí"
    : `${new Intl.NumberFormat("vi-VN").format(price)} ₫`;
}

export default function StudentRoadmapsView() {
  const router = useRouter();
  const [roadmaps, setRoadmaps] = useState<StudentRoadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RoadmapFilter>("all");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/student/roadmaps")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Không thể tải lộ trình học.");
        }
        if (!ignore) setRoadmaps(data.roadmaps || []);
      })
      .catch((cause: unknown) => {
        if (!ignore) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải lộ trình học.",
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const visibleRoadmaps = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    return roadmaps.filter((roadmap) => {
      if (filter === "learning" && !roadmap.is_enrolled) return false;
      if (filter === "free" && roadmap.price !== 0) return false;
      return (
        !query ||
        roadmap.title.toLocaleLowerCase("vi").includes(query) ||
        roadmap.description.toLocaleLowerCase("vi").includes(query) ||
        roadmap.subject_name.toLocaleLowerCase("vi").includes(query) ||
        roadmap.teacher_name.toLocaleLowerCase("vi").includes(query)
      );
    });
  }, [filter, roadmaps, search]);

  async function joinRoadmap(roadmap: StudentRoadmap) {
    setJoiningId(roadmap._id);
    setError("");
    try {
      const response = await fetch(
        `/api/student/roadmaps/${roadmap._id}/enroll`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể tham gia lộ trình.");
      }
      router.push(`/student/roadmaps/${roadmap._id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tham gia lộ trình.",
      );
      setJoiningId(null);
    }
  }

  const enrolledCount = roadmaps.filter((item) => item.is_enrolled).length;
  const completedCount = roadmaps.filter(
    (item) => item.is_enrolled && item.completion_percentage >= 100,
  ).length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-950/10 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-100">
            Không gian học tập
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Lộ trình của bạn, từng bước tiến bộ
          </h2>
          <p className="mt-2 text-sm leading-6 text-indigo-100">
            Theo dõi tiến độ, hoàn thành bài học và ôn luyện theo kế hoạch do
            giáo viên xây dựng.
          </p>
        </div>
        <div className="relative z-10 mt-6 flex flex-wrap gap-3">
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-xl font-bold">{enrolledCount}</p>
            <p className="text-[11px] text-indigo-100">Đang theo học</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-xl font-bold">{completedCount}</p>
            <p className="text-[11px] text-indigo-100">Đã hoàn thành</p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border-[34px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-36 right-40 h-64 w-64 rounded-full border-[28px] border-white/10" />
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="font-bold"
            aria-label="Đóng thông báo lỗi"
          >
            ×
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Khám phá lộ trình
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Chọn hành trình phù hợp với mục tiêu học tập của bạn.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <span className="sr-only">Tìm lộ trình học</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên lộ trình..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 sm:w-60 dark:border-slate-700 dark:bg-slate-950"
              />
              <span className="absolute left-3 top-2 text-slate-400">⌕</span>
            </label>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {(
                [
                  ["all", "Tất cả"],
                  ["learning", "Đang học"],
                  ["free", "Miễn phí"],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    filter === value
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-200"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Đang tải danh sách lộ trình...
          </div>
        ) : roadmaps.length === 0 ? (
          <div className="my-5 rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              ◫
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white">
              Chưa có lộ trình được xuất bản
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Khi giáo viên xuất bản lộ trình, chương trình học sẽ hiển thị tại
              đây.
            </p>
          </div>
        ) : visibleRoadmaps.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-500">
            Không tìm thấy lộ trình phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleRoadmaps.map((roadmap) => (
              <article
                key={roadmap._id}
                className="overflow-hidden rounded-2xl border border-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:hover:border-indigo-900"
              >
                <div
                  className="relative h-40 bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 bg-cover bg-center"
                  style={
                    roadmap.cover_image
                      ? { backgroundImage: `url("${roadmap.cover_image}")` }
                      : undefined
                  }
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-800">
                    {formatPrice(roadmap.price)}
                  </span>
                  {roadmap.is_enrolled && (
                    <span className="absolute right-4 top-4 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                      Đang học
                    </span>
                  )}
                  <h3 className="absolute bottom-4 left-4 right-4 line-clamp-2 text-lg font-bold text-white">
                    {roadmap.title}
                  </h3>
                </div>
                <div className="p-4">
                  <p className="line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-slate-500">
                    {roadmap.description || "Lộ trình học được thiết kế theo mục tiêu của bạn."}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                    {roadmap.subject_name}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Giáo viên: {roadmap.teacher_name}</span>
                    <span>
                      {roadmap.content_count} nội dung
                    </span>
                  </div>
                  {roadmap.is_enrolled && (
                    <div className="mt-4">
                      <div className="mb-1.5 flex justify-between text-[11px] font-medium text-slate-500">
                        <span>Tiến độ hoàn thành</span>
                        <span>{roadmap.completion_percentage}%</span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                        role="progressbar"
                        aria-valuenow={roadmap.completion_percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Tiến độ lộ trình"
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                          style={{
                            width: `${Math.min(100, roadmap.completion_percentage)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-4">
                    {roadmap.is_enrolled && roadmap.has_access ? (
                      <Link
                        href={`/student/roadmaps/${roadmap._id}`}
                        className="block rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        Tiếp tục học
                      </Link>
                    ) : roadmap.can_start ? (
                      <button
                        type="button"
                        disabled={joiningId === roadmap._id}
                        onClick={() => void joinRoadmap(roadmap)}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {joiningId === roadmap._id
                          ? "Đang mở lộ trình..."
                          : "Bắt đầu học"}
                      </button>
                    ) : roadmap.price === 0 ? (
                      <button
                        type="button"
                        disabled={joiningId === roadmap._id}
                        onClick={() => void joinRoadmap(roadmap)}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {joiningId === roadmap._id
                          ? "Đang đăng ký..."
                          : "Tham gia miễn phí"}
                      </button>
                    ) : (
                      <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-center text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        Cần hoàn tất thanh toán để mở nội dung lộ trình
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
