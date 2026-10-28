"use client";

import { signOut } from "next-auth/react";

type LogoutButtonProps = {
  /** Giao dien nut: "solid" (nen dac, mac dinh) | "ghost" (trong suot, phu hop navbar toi) | "link" (chi text) */
  variant?: "solid" | "ghost" | "link";
  /** Kich thuoc: "sm" | "md" (mac dinh) */
  size?: "sm" | "md";
  /** Text hien thi, mac dinh "Dang xuat" */
  label?: string;
  /** Trang se redirect sau khi dang xuat */
  callbackUrl?: string;
  /** Class bo sung de navbar tu style them neu can */
  className?: string;
};

const variantStyles: Record<NonNullable<LogoutButtonProps["variant"]>, string> = {
  solid: "bg-blue-600 text-white hover:bg-blue-700 border border-transparent shadow-xs",
  ghost: "bg-transparent text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-700",
  link:  "bg-transparent text-blue-600 dark:text-blue-400 hover:underline border-0 px-0 py-0",
};

const sizeStyles: Record<NonNullable<LogoutButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export default function LogoutButton({
  variant = "solid",
  size = "md",
  label = "Đăng xuất",
  callbackUrl = "/auth/login",
  className = "",
}: LogoutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className={[
        "inline-flex items-center gap-1.5 rounded-xl font-semibold transition-all duration-150 cursor-pointer",
        variantStyles[variant],
        variant !== "link" ? sizeStyles[size] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title="Đăng xuất khỏi hệ thống"
    >
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
