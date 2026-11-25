import { redirect } from "next/navigation";
import Link from "next/link";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import PracticeResultDetailView from "@/components/practice/practice-result-detail-view";
import { getCurrentUser } from "@/lib/auth-guards";
import { getStudentAttemptDetail } from "@/lib/practice-history-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentPracticeHistoryDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(
      `/auth/login?callbackUrl=${encodeURIComponent(`/student/practice/history/${id}`)}`
    );
  }

  const attempt = await getStudentAttemptDetail(id, user.id);

  return (
    <RoleDashboardShell
      user={user}
      title="Chi Tiết & Đánh Giá Bài Làm"
      subtitle="Xem điểm số, đối chiếu đáp án đã chọn, câu bỏ trống và lời giải chi tiết"
      actions={
        <Link
          href="/student/practice/history"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          ← Lịch sử làm bài
        </Link>
      }
    >
      {!attempt ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-2xl">
            🔍
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Không tìm thấy bài làm này
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Bài làm không tồn tại, chưa hoàn thành, hoặc bạn không có quyền truy cập lượt làm bài này.
          </p>
          <div className="pt-2">
            <Link
              href="/student/practice/history"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition"
            >
              ← Quay lại lịch sử làm bài
            </Link>
          </div>
        </div>
      ) : (
        <PracticeResultDetailView attempt={attempt} />
      )}
    </RoleDashboardShell>
  );
}
