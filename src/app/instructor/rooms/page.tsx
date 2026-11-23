import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import InstructorRoomsManager from "@/components/rooms/instructor-rooms-manager";
import Link from "next/link";

export const metadata = {
  title: "Phòng Thi Trực Tuyến | PQP AI-Quizz",
  description:
    "Quản lý, phát hành mã phòng thi trực tuyến và điều phối thí sinh theo thời gian thực",
};

export default async function InstructorRoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ examId?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/instructor/rooms");
  }

  if (user.role !== "instructor" && user.role !== "admin") {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const examId = typeof params.examId === "string" ? params.examId : "";

  return (
    <RoleDashboardShell
      user={user}
      title="Phòng Thi Trực Tuyến (Live)"
      subtitle="Mở ca thi trực tuyến từ đề thi đã xuất bản, cấp mã phòng cho học viên và theo dõi tiến độ làm bài"
      actions={
        <Link
          href="/instructor/exams"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-xs transition"
        >
          <span>← Ngân hàng đề thi</span>
        </Link>
      }
    >
      <InstructorRoomsManager initialExamId={examId} />
    </RoleDashboardShell>
  );
}

