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
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition"
        >
          ← Quay lại Bàn làm việc Giáo viên
        </Link>
        <Link
          href="/instructor/questions"
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
        >
          <span>Đi tới Ngân Hàng Câu Hỏi &amp; AI</span>
          <span>&rarr;</span>
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

