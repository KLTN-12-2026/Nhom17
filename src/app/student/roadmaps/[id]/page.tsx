import { redirect } from "next/navigation";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import StudentRoadmapDetail from "@/components/roadmaps/student-roadmap-detail";
import { getCurrentUser } from "@/lib/auth-guards";

export const metadata = {
  title: "Chi tiết lộ trình | AI Quiz App",
  description: "Xem nội dung và tiến độ lộ trình học",
};

export default async function StudentRoadmapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/student/roadmaps");
  }
  if (user.role === "instructor") redirect("/instructor");
  if (user.role === "admin") redirect("/admin");

  const { id } = await params;
  return (
    <RoleDashboardShell
      user={user}
      title="Lộ trình học tập"
      subtitle="Theo dõi tiến độ và hoàn thành từng nội dung trong lộ trình"
    >
      <StudentRoadmapDetail roadmapId={id} />
    </RoleDashboardShell>
  );
}
