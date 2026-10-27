"use client";

import { forgotPasswordSchema } from "@/lib/validations/auth";
import Link from "next/link";
import { useState } from "react";

const genericMessage =
  "If an account exists with this email, password reset instructions will be sent.";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Email không hợp lệ");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "Unable to process the request. Please try again.");
        return;
      }

      setMessage(data.message ?? genericMessage);
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Forgot Password?</h1>
        <p className="mt-3 text-sm text-slate-500">
          Enter your account email to receive password reset instructions.
        </p>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="h-12 w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Sending..." : "Send Instructions"}
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