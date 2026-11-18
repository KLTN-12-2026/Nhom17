import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import PracticeSessionView from "@/components/practice/practice-session-view";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PracticeSessionPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/student/practice");
  }

  const { id } = await params;

  return (
    <RoleDashboardShell
      user={user}
      title="Không Gian Tự Luyện Không Áp Lực"
      subtitle="Chế độ học tập tự do: Tích lũy kiến thức qua từng câu hỏi & kiểm tra lời giải chi tiết tức thì"
      actions={
        <Link
          href="/student/practice"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition cursor-pointer"
        >
          <span>← Thoát ra danh mục</span>
        </Link>
      }
    >
      <PracticeSessionView attemptId={id} />
    </RoleDashboardShell>
  );
}
