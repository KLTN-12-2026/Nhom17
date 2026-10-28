//src\app\auth\login\page.tsx
import LoginForm from "@/components/auth/login-form";
import AuthShell from "@/components/auth/auth-shell";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-slate-500">
            Loading form...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
