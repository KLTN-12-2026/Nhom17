import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import OfficialExamSessionView from "@/components/rooms/official-exam-session-view";

export const metadata = {
  title: "Làm Bài Thi Trực Tuyến | PQP AI-Quizz",
  description: "Giao diện làm bài thi trắc nghiệm trực tuyến với đồng hồ đếm ngược và tự động lưu đáp án",
};

export default async function StudentOfficialExamPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const user = await getCurrentUser();
  const { roomId } = await params;

  if (!user) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/student/exam/${roomId}`)}`);
  }

  return <OfficialExamSessionView roomId={roomId} />;
}

