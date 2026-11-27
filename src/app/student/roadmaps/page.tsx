import { redirect } from "next/navigation";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import StudentRoadmapsView from "@/components/roadmaps/student-roadmaps-view";
import { getCurrentUser } from "@/lib/auth-guards";

export const metadata = {
  title: "Lộ trình học tập | AI Quiz App",
  description: "Khám phá và theo dõi các lộ trình học tập của bạn",
};

export default async function StudentRoadmapsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/student/roadmaps");
  }
  if (user.role === "instructor") redirect("/instructor");
  if (user.role === "admin") redirect("/admin");

  return (
    <RoleDashboardShell
      user={user}
      title="Lộ trình học tập"
      subtitle="Khám phá chương trình học và tiếp tục hành trình của bạn"
    >
      <StudentRoadmapsView />
    </RoleDashboardShell>
  );
}
