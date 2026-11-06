import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import ExamManagerView from "@/components/exams/exam-manager-view";

export const metadata = {
  title: "Quản Lý & Soạn Đề Thi | AI Quiz App",
  description: "Tạo và cấu hình đề thi trắc nghiệm THPT, bốc câu hỏi ngẫu nhiên và quản lý đề thi",
};

export default async function InstructorExamsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/instructor/exams");
  }

  if (user.role !== "instructor" && user.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <RoleDashboardShell
      user={user}
      title="Quản Lý & Biên Soạn Đề Thi"
      subtitle="Thiết lập đề thi trắc nghiệm chuẩn ma trận kiến thức, bốc ngẫu nhiên từ ngân hàng và thi thử trực tiếp"
    >
      <ExamManagerView currentUser={user} />
    </RoleDashboardShell>
  );
}
