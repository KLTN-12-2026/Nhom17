import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import InstructorRoomLiveView from "@/components/rooms/instructor-room-live-view";

export const metadata = {
  title: "Điều Phối Phòng Thi Live | PQP AI-Quizz",
  description: "Theo dõi danh sách thí sinh, phát đề và thu bài thời gian thực",
};

export default async function InstructorRoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect(`/auth/login?callbackUrl=/instructor/rooms/${id}`);
  }

  if (user.role !== "instructor" && user.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <RoleDashboardShell
      user={user}
      title="Điều Phối Phòng Thi Trực Tiếp"
      subtitle="Phát lệnh bắt đầu ca thi, theo dõi tiến độ làm bài và thu bài tự động theo thời gian thực"
    >
      <InstructorRoomLiveView roomId={id} />
    </RoleDashboardShell>
  );
}

