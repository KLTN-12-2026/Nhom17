import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import PracticeCatalogView from "@/components/practice/practice-catalog-view";
import Link from "next/link";

type StudentPracticePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentPracticePage({
  searchParams,
}: StudentPracticePageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/student/practice");
  }

  const query = await searchParams;
  const initialTopicId =
    typeof query.topic_id === "string" ? query.topic_id : "";
  const initialSubjectId =
    typeof query.subject_id === "string" ? query.subject_id : "";

  return (
    <RoleDashboardShell
      user={user}
      title="Ôn Tập Kiến Thức Theo Chuyên Đề"
      subtitle="Lựa chọn môn học & dạng bài, làm trắc nghiệm tự luyện không áp lực và nhận giải thích chi tiết tức thì"
      actions={
        <Link
          href="/student/practice/history"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold text-xs shadow-md transition cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Lịch Sử Tự Luyện</span>
        </Link>
      }
    >
      <PracticeCatalogView
        initialTopicId={initialTopicId}
        initialSubjectId={initialSubjectId}
      />
    </RoleDashboardShell>
  );
}
