import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import InstructorRoadmapsView from "@/components/roadmaps/instructor-roadmaps-view";

export const dynamic = "force-dynamic";

export default async function InstructorRoadmapsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/instructor/roadmaps");
  if (user.role !== "instructor" && user.role !== "admin") redirect("/unauthorized");
  return (
    <RoleDashboardShell user={user} title="Quản lý lộ trình kiến thức" subtitle="Tạo lộ trình, sắp xếp nội dung theo giai đoạn và xuất bản cho học sinh.">
      <InstructorRoadmapsView />
    </RoleDashboardShell>
  );
}
