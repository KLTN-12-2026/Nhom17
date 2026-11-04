"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  name: string;
  email: string;
  phoneNumber: string;
  schoolName: string;
  dateOfBirth: string;
  role: "student" | "instructor";
  startDate: string;
}

interface ProfileResponse {
  success: boolean;
  error?: string;
  message?: string;
  profile?: {
    name: string;
    email: string;
    phone_number: string;
    school_name: string;
    date_of_birth: string;
  };
}

const roleLabels = {
  student: "Học viên",
  instructor: "Giảng viên",
};

const roleStyles = {
  student: {
    gradient: "from-blue-700 via-blue-600 to-blue-500",
    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
    avatar: "from-blue-200 to-sky-100 text-blue-800",
  },
  instructor: {
    gradient: "from-blue-800 via-blue-700 to-blue-600",
    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
    avatar: "from-blue-200 to-sky-100 text-blue-800",
  },
};

export default function ProfileForm({
  name: initialName,
  email,
  phoneNumber: initialPhoneNumber,
  schoolName: initialSchoolName,
  dateOfBirth: initialDateOfBirth,
  role,
  startDate,
}: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [schoolName, setSchoolName] = useState(initialSchoolName);
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone_number: phoneNumber,
          school_name: schoolName,
          date_of_birth: dateOfBirth,
        }),
      });

      let result: ProfileResponse;
      try {
        result = (await response.json()) as ProfileResponse;
      } catch {
        throw new Error("Không thể đọc phản hồi từ máy chủ. Vui lòng thử lại.");
      }

      if (!response.ok || !result.success || !result.profile) {
        throw new Error(result.error ?? "Không thể cập nhật thông tin cá nhân.");
      }

      setName(result.profile.name);
      setPhoneNumber(result.profile.phone_number);
      setSchoolName(result.profile.school_name);
      setDateOfBirth(result.profile.date_of_birth);
      setSuccess(result.message ?? "Thông tin cá nhân đã được cập nhật.");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Đã xảy ra lỗi khi cập nhật thông tin cá nhân."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const styles = roleStyles[role];
  const startDateLabel =
    role === "student" ? "Ngày lập tài khoản" : "Ngày bắt đầu giảng dạy";

  return (
    <div className="space-y-6">
      <section
        className={`relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${styles.gradient} px-6 py-7 text-white shadow-lg shadow-slate-900/10 sm:px-8 sm:py-9`}
      >
        <div className="absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full border-[32px] border-white/10" />
        <div className="absolute -bottom-28 right-40 -z-10 h-56 w-56 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <div
              className={`flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${styles.avatar} text-3xl font-black shadow-lg shadow-slate-950/10 ring-4 ring-white/20 sm:h-20 sm:w-20`}
              aria-hidden="true"
            >
              {name.trim().charAt(0).toLocaleUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                Hồ sơ cá nhân
              </p>
              <h2 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">
                {name || "Chưa cập nhật tên"}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                  {roleLabels[role]}
                </span>
                <span className="max-w-full truncate text-sm text-white/75">
                  {email}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm sm:min-w-52">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-medium text-white/70">{startDateLabel}</p>
              <p className="mt-0.5 text-sm font-bold text-white">{startDate}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7"
        >
          <div className="mb-7 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.232 5.232l3.536 3.536M4 20l4.5-1 10.268-10.268a2.5 2.5 0 00-3.536-3.536L4.964 15.464 4 20z" />
              </svg>
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Chỉnh sửa thông tin
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Cập nhật thông tin liên hệ để tài khoản luôn chính xác.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Họ và tên
              </span>
              <input
                autoComplete="name"
                maxLength={100}
                minLength={2}
                name="name"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email đăng nhập
              </span>
              <input
                autoComplete="email"
                readOnly
                type="email"
                value={email}
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
              />
              <span className="mt-2 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Email hiện chưa thể thay đổi.
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Ngày tháng năm sinh
              </span>
              <input
                autoComplete="bday"
                max={new Date().toISOString().slice(0, 10)}
                name="date_of_birth"
                onChange={(event) => setDateOfBirth(event.target.value)}
                type="date"
                value={dateOfBirth}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Tên trường
              </span>
              <input
                autoComplete="organization"
                maxLength={150}
                name="school_name"
                onChange={(event) => setSchoolName(event.target.value)}
                value={schoolName}
                placeholder="Nhập tên trường"
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Số điện thoại
              </span>
              <input
                autoComplete="tel"
                maxLength={20}
                name="phone_number"
                onChange={(event) => setPhoneNumber(event.target.value)}
                value={phoneNumber}
                placeholder="Nhập số điện thoại"
                type="tel"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600"
              />
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
            >
              {error}
            </p>
          )}
          {success && (
            <p
              role="status"
              className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
            >
              {success}
            </p>
          )}

          <div className="mt-7 flex flex-col gap-4 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Ngày bắt đầu được ghi nhận tự động và không thể chỉnh sửa.
            </p>
            <button
              disabled={isSaving}
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang lưu...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Lưu thay đổi
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Thông tin tài khoản
              </h3>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles.badge}`}>
                {roleLabels[role]}
              </span>
            </div>
            <dl className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Email</dt>
                  <dd className="mt-1 break-all text-sm font-medium text-slate-800 dark:text-slate-200">
                    {email}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                  </svg>
                </span>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{startDateLabel}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {startDate}
                  </dd>
                  <dd className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Tự động theo ngày tạo tài khoản
                  </dd>
                </div>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50/80 p-5 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 11c0-1.105.895-2 2-2s2 .895 2 2v2m-8 0v-2a4 4 0 118 0m-9 4h10a1 1 0 011 1v4a1 1 0 01-1 1H7a1 1 0 01-1-1v-4a1 1 0 011-1z" />
              </svg>
              <h3 className="text-sm font-bold">Quyền riêng tư</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-blue-900/75 dark:text-blue-100/70">
              Email và vai trò được bảo vệ để đảm bảo an toàn cho quyền truy cập
              và lịch sử hoạt động của bạn.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
