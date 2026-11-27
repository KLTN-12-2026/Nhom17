import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import RoadmapManagerView from "@/components/roadmaps/roadmap-manager-view";

export const metadata = {
  title: "Quản lý lộ trình học | AI Quiz App",
  description: "Tạo lộ trình học có thu phí hoặc miễn phí, sắp xếp nội dung và theo dõi học viên",
};

export default async function InstructorRoadmapsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/instructor/roadmaps");
  }

  if (user.role !== "instructor" && user.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <RoleDashboardShell
      user={user}
      title="Quản lý lộ trình học"
      subtitle="Đóng gói chuyên đề, tài liệu và đề thi thành hành trình học có thể xuất bản miễn phí hoặc thu phí"
    >
      <RoadmapManagerView />
    </RoleDashboardShell>
  );
}
