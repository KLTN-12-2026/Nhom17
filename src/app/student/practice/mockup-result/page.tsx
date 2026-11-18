import { redirect } from "next/navigation";
import Link from "next/link";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import PracticeResultDetailView from "@/components/practice/practice-result-detail-view";
import { getCurrentUser } from "@/lib/auth-guards";
import { mockAttemptDetail } from "@/lib/mock/practice-result";

export default async function PracticeMockResultPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/student/practice/mock-result");
  if (user.role === "instructor") redirect("/instructor");
  if (user.role === "admin") redirect("/admin");

  return <RoleDashboardShell user={user} title="Kết Quả Bài Tự Luyện" subtitle="Bản demo xem điểm, đáp án đã chọn, đáp án đúng và lời giải chi tiết" actions={<Link href="/student/practice/history" className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">← Lịch sử tự luyện</Link>}>
    <PracticeResultDetailView attempt={mockAttemptDetail} />
  </RoleDashboardShell>;
}
