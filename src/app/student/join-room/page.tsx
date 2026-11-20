import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import StudentJoinRoomView from "@/components/rooms/student-join-room-view";

export const metadata = {
  title: "Tham Gia Phòng Thi Trực Tuyến | PQP AI-Quizz",
  description: "Nhập mã phòng để tham gia ca thi trực tuyến đồng bộ thời gian thực",
};

export default async function StudentJoinRoomPage({
  searchParams,
}: {
  searchParams: Promise<{
    room_code?: string | string[];
    code?: string | string[];
    roomId?: string | string[];
  }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const rawCode =
    typeof params.room_code === "string"
      ? params.room_code
      : typeof params.code === "string"
      ? params.code
      : "";
  const rawRoomId = typeof params.roomId === "string" ? params.roomId : "";

  if (!user) {
    const query = rawCode
      ? `?room_code=${encodeURIComponent(rawCode)}`
      : "";
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/student/join-room${query}`)}`);
  }

  return (
    <RoleDashboardShell
      user={user}
      title="Phòng Thi Trực Tuyến"
      subtitle="Nhập mã phòng từ giảng viên để vào phòng chờ đồng bộ và tham gia làm bài thi tính giờ"
    >
      <StudentJoinRoomView
        initialRoomCode={rawCode}
        initialRoomId={rawRoomId}
        currentUserName={user.name}
      />
    </RoleDashboardShell>
  );
}

