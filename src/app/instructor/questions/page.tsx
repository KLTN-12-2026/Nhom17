import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import QuestionBankManager from "@/components/questions/question-bank-manager";

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
    >
      <QuestionBankManager currentUser={user} />
    </RoleDashboardShell>
  );
}
