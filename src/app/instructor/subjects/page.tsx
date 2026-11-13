import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import KnowledgeTreeManager from "@/components/subjects/knowledge-tree-manager";
import { getKnowledgeTreeData } from "@/lib/knowledge-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InstructorSubjectsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/instructor/subjects");
  }

  if (user.role !== "instructor" && user.role !== "admin") {
    redirect("/unauthorized");
  }

  const { subjects, topics } = await getKnowledgeTreeData();

  return (
    <RoleDashboardShell
      user={user}
      title="Danh Mục Môn Học & Cây Chủ Đề Kiến Thức"
      subtitle="Tổ chức chương trình giảng dạy phân cấp đa tầng để biên soạn câu hỏi trắc nghiệm và sinh đề bằng AI"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/instructor"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Quay lại Tổng quan Giảng dạy</span>
        </Link>
        <Link
          href="/instructor/questions"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <span>Ngân hàng Câu hỏi &amp; AI</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>

      <KnowledgeTreeManager
        initialSubjects={subjects}
        initialTopics={topics}
        currentUser={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }}
      />
    </RoleDashboardShell>
  );
}

