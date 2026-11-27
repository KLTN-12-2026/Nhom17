import { redirect } from "next/navigation";
import Link from "next/link";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import { getCurrentUser } from "@/lib/auth-guards";
import { OrderCheckoutView } from "@/components/roadmaps/roadmap-views";
export default async function StudentOrderCheckoutPage({params}:{params:Promise<{id:string}>}){const user=await getCurrentUser();const {id}=await params;if(!user)redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/student/orders/${id}`)}`);if(user.role!=="student")redirect(user.role=== "admin"?"/admin":"/instructor");return <RoleDashboardShell user={user} title="Thanh Toán Đơn Hàng" subtitle="Xem thông tin đơn hàng và trạng thái thanh toán." actions={<Link href="/student/orders" className="rounded-xl border px-4 py-2.5 text-xs font-bold">← Đơn hàng</Link>}><OrderCheckoutView orderId={id}/></RoleDashboardShell>}
