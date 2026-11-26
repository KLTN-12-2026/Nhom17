import { redirect } from "next/navigation";
import Link from "next/link";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import { getCurrentUser } from "@/lib/auth-guards";
import { RoadmapCatalogView } from "@/components/roadmaps/roadmap-views";
export default async function StudentRoadmapsPage(){const user=await getCurrentUser();if(!user)redirect("/auth/login?callbackUrl=/student/roadmaps");if(user.role!=="student")redirect(user.role=== "admin"?"/admin":"/instructor");return <RoleDashboardShell user={user} title="Lộ Trình Ôn Luyện" subtitle="Chọn chương trình học theo mục tiêu thi, từng bước củng cố kiến thức và theo dõi tiến độ." actions={<Link href="/student/orders" className="rounded-xl border px-4 py-2.5 text-xs font-bold">Đơn hàng của tôi</Link>}><RoadmapCatalogView /></RoleDashboardShell>}
