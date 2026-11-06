import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import QuestionBankManager from "@/components/questions/question-bank-manager";
import Link from "next/link";

export default async function InstructorQuestionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/instructor/questions");
  }

  if (user.role !== "instructor" && user.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <RoleDashboardShell
      user={user}
      title="Ngân Hàng Câu Hỏi Luyện Thi THPT"
      subtitle="Quản lý kho câu hỏi trắc nghiệm Toán, Lý, Hóa theo từng chuyên đề tri thức và mức độ nhận thức"
      actions={
        <Link
          href={user.role === "admin" ? "/admin/subjects" : "/instructor/subjects"}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 font-bold text-xs shadow-2xs transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span>Quản Lý Cây Chủ Đề</span>
        </Link>
      }
    >
      <QuestionBankManager currentUser={user} />
    </RoleDashboardShell>
  );
}
