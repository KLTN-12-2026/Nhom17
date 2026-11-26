import { redirect } from "next/navigation";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import { getCurrentUser } from "@/lib/auth-guards";
import { StudentOrdersView } from "@/components/roadmaps/roadmap-views";
export default async function StudentOrdersPage(){const user=await getCurrentUser();if(!user)redirect("/auth/login?callbackUrl=/student/orders");if(user.role!=="student")redirect(user.role=== "admin"?"/admin":"/instructor");return <RoleDashboardShell user={user} title="Đơn Hàng Lộ Trình" subtitle="Theo dõi trạng thái mua và thanh toán các lộ trình học."><StudentOrdersView/></RoleDashboardShell>}
