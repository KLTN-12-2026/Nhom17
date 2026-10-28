import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import UsersManager, { ManagedUser } from "@/components/admin/users-manager";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/admin/users");
  }

  if (user.role !== "admin") {
    redirect("/unauthorized");
  }

  await connectDB();
  const rawUsers = await User.find({})
    .select("name email phone_number role status is_active createdAt")
    .sort({ createdAt: -1 })
    .lean();

  // Chuẩn hóa dữ liệu an toàn để truyền cho Client Component
  const serializedUsers: ManagedUser[] = rawUsers.map((u) => ({
    _id: String(u._id),
    name: u.name,
    email: u.email,
    phone_number: u.phone_number || "",
    role: u.role,
    status: u.status,
    is_active: u.is_active,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
  }));

  return (
    <RoleDashboardShell
      user={user}
      title="Quản Lý Tài Khoản Người Dùng"
      subtitle="Theo dõi, phân quyền, cấp tài khoản và quản trị bảo mật hệ thống"
    >
      {/* Navigation Breadcrumb & Back */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition"
        >
          ← Quay lại Tổng quan Quản trị
        </Link>
        <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
          Dữ liệu trực tiếp từ <strong>MongoDB Atlas</strong>
        </span>
      </div>

      {/* Users Manager Client Component */}
      <UsersManager initialUsers={serializedUsers} currentAdminId={user.id} />
    </RoleDashboardShell>
  );
}
