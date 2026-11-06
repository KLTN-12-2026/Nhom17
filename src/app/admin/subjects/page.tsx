import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import KnowledgeTreeManager from "@/components/subjects/knowledge-tree-manager";
import { getKnowledgeTreeData } from "@/lib/knowledge-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSubjectsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/admin/subjects");
  }

  if (user.role !== "admin") {
    redirect("/unauthorized");
  }

  const { subjects, topics } = await getKnowledgeTreeData();

  return (
    <RoleDashboardShell
      user={user}
      title="Quản Lý Danh Mục Môn Học & Cây Chủ Đề Kiến Thức"
      subtitle="Quản trị cấu trúc phân cấp môn học, chương mục và chuyên đề phục vụ ngân hàng câu hỏi & AI trên toàn hệ thống"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition"
        >
          ← Quay lại Bàn làm việc Quản trị
        </Link>
        <span className="text-xs px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Cây chủ đề đa cấp đệ quy (Self-referencing Hierarchy)
        </span>
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

