"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);

    const payload = {
      name,
      email: email.trim().toLowerCase(),
      password,
      role,
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setMessage(data.message);

      if (response.ok) {
        setIsSuccess(true);
        setName("");
        setEmail("");
        setPassword("");

        setTimeout(() => {
          router.push("/auth/login?registered=true");
        }, 1200);
      } else {
        setIsSuccess(false);
      }
    } catch {
      setMessage("Could not connect to the server. Please try again later.");
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleRegister() {
    setIsGoogleLoading(true);
    signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="space-y-6">
      {/* Header & Back link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition mb-4"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
          Join your learning desk
        </p>

        <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Create your account
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Set up your workspace and start practicing in less than a minute.
        </p>
      </div>

      {/* Google Quick Sign Up */}
      <button
        type="button"
        onClick={handleGoogleRegister}
        disabled={isGoogleLoading || isLoading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>
          {isGoogleLoading ? "Connecting to Google..." : "Sign up with Google (Student)"}
        </span>
      </button>

      {/* Divider */}
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#f8f7f3] px-3 font-semibold tracking-wider text-slate-400">
            Or register with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Select your role
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                role === "student"
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="block text-sm font-bold text-slate-900">
                  Student
                </span>
                {role === "student" && (
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                )}
              </div>
              <span className="mt-1 block text-xs text-slate-500">
                Practice & AI diagnostics
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRole("instructor")}
              className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                role === "instructor"
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="block text-sm font-bold text-slate-900">
                  Instructor
                </span>
                {role === "instructor" && (
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                )}
              </div>
              <span className="mt-1 block text-xs text-slate-500">
                Create exams & host rooms
              </span>
            </button>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Full name
          </label>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (message) setMessage("");
            }}
            placeholder="Avery Morgan"
            required
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (message) setMessage("");
            }}
            placeholder="you@university.edu"
            required
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (message) setMessage("");
              }}
              placeholder="At least 8 characters"
              required
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-16 text-sm outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-blue-600 transition cursor-pointer"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <span className="mt-1 block text-[11px] text-slate-400">
            Must be at least 8 characters long.
          </span>
        </div>

        {/* Status message */}
        {message && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              isSuccess
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
            role="alert"
          >
            {isSuccess ? (
              <svg className="w-5 h-5 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span>{message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="h-12 w-full rounded-xl bg-blue-600 font-bold text-white shadow-[0_4px_0_#1d4ed8] transition hover:bg-blue-700 active:translate-y-0.5 active:shadow-[0_2px_0_#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer text-sm"
        >
          {isLoading
            ? "Creating account..."
            : `Create ${role === "student" ? "Student" : "Instructor"} Account`}
        </button>

        <p className="pt-2 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-bold text-blue-600 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}