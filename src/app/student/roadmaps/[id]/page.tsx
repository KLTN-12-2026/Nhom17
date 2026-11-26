import { redirect } from "next/navigation";
import Link from "next/link";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import { getCurrentUser } from "@/lib/auth-guards";
import { RoadmapDetailView } from "@/components/roadmaps/roadmap-views";
export default async function StudentRoadmapDetailPage({params}:{params:Promise<{id:string}>}){const user=await getCurrentUser();const {id}=await params;if(!user)redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/student/roadmaps/${id}`)}`);if(user.role!=="student")redirect(user.role=== "admin"?"/admin":"/instructor");return <RoleDashboardShell user={user} title="Chi Tiết Lộ Trình" subtitle="Xem các giai đoạn, nội dung và tiến độ ôn luyện." actions={<Link href="/student/roadmaps" className="rounded-xl border px-4 py-2.5 text-xs font-bold">← Tất cả lộ trình</Link>}><RoadmapDetailView roadmapId={id}/></RoleDashboardShell>}
