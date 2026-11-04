import { redirect } from "next/navigation";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import ProfileForm from "@/components/profile/profile-form";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-guards";
import { User } from "@/models/User";

interface ProfilePageProps {
  role: "student" | "instructor";
}

const roleTitles = {
  student: "học viên",
  instructor: "giảng viên",
};

export default async function ProfilePage({ role }: ProfilePageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/auth/login?callbackUrl=/${role}/profile`);
  }

  if (user.role !== role) {
    redirect("/unauthorized");
  }

  await connectDB();
  const profile = await User.findById(user.id)
    .select("name email phone_number date_of_birth school_name role createdAt")
    .lean();

  if (!profile) {
    redirect("/unauthorized");
  }

  return (
    <RoleDashboardShell
      user={user}
      title="Thông Tin Cá Nhân"
      subtitle={`Quản lý thông tin tài khoản ${roleTitles[role]} của bạn`}
    >
      <ProfileForm
        name={profile.name}
        email={profile.email}
        phoneNumber={profile.phone_number ?? ""}
        schoolName={profile.school_name ?? ""}
        dateOfBirth={
          profile.date_of_birth
            ? new Date(profile.date_of_birth).toISOString().slice(0, 10)
            : ""
        }
        role={role}
        startDate={new Intl.DateTimeFormat("vi-VN", {
          dateStyle: "long",
          timeZone: "Asia/Ho_Chi_Minh",
        }).format(profile.createdAt)}
      />
    </RoleDashboardShell>
  );
}
