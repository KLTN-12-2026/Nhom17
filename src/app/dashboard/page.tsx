import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/dashboard");
  }

  // Phân luồng điều hướng theo vai trò (RBAC Smart Routing)
  if (user.role === "admin") {
    redirect("/admin");
  }

  if (user.role === "instructor") {
    redirect("/instructor");
  }

  redirect("/student");
}