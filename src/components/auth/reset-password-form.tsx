//src\components\auth\reset-password-form.tsx
"use client";

import { resetPasswordSchema } from "@/lib/validations/auth";
import Link from "next/link";
import { useState } from "react";

const invalidLinkMessage = "The password reset link is invalid or has expired.";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const result = resetPasswordSchema.safeParse({
      token,
      password,
      confirmPassword,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Thông tin chưa hợp lệ");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? invalidLinkMessage);
        return;
      }

      setMessage(data.message ?? "Password updated successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">
          Set a New Password
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Your password must be at least 8 characters long.
        </p>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        New Password
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Confirm Password
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {!token && (
        <p role="alert" className="text-sm text-red-600">
          {invalidLinkMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!token || isLoading}
        className="h-12 w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Updating..." : "Update Password"}
      </button>

      {error && (
        <p role="alert" className="text-center text-sm text-red-600">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-center text-sm text-green-700">
          {message}
        </p>
      )}

      <p className="text-center text-sm">
        <Link
          href="/auth/login"
          className="font-semibold text-blue-600 hover:underline"
        >
          Back to Login
        </Link>
      </p>
    </form>
  );
}
