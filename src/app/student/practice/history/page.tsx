import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import PracticeHistoryView from "@/components/practice/practice-history-view";
import Link from "next/link";

export default async function StudentPracticeHistoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/student/practice/history");
  }

  return (
    <RoleDashboardShell
      user={user}
      title="Lịch Sử Làm Bài & Tiến Độ Học Tập"
      subtitle="Theo dõi toàn bộ kết quả thi phòng trực tuyến và lịch sử tự luyện đề theo chủ đề"
      actions={
        <Link
          href="/student/practice"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition cursor-pointer"
        >
          <span>+ Luyện Dạng Bài Mới</span>
        </Link>
      }
    >
      <PracticeHistoryView />
    </RoleDashboardShell>
  );
}
