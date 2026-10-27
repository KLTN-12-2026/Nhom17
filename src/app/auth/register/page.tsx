import AuthShell from "@/components/auth/auth-shell";
import RegisterForm from "@/components/auth/register-form";
import { Suspense } from "react";

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-slate-500">
            Loading form...
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}