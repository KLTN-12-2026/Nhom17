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
  solid: "bg-blue-600 text-white hover:bg-blue-700 border border-transparent",
  ghost: "bg-transparent text-white hover:bg-white/10 border border-white/30",
  link:  "bg-transparent text-blue-500 hover:underline border-0 px-0 py-0",
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
        "rounded-lg font-semibold transition-colors duration-150 cursor-pointer",
        variantStyles[variant],
        variant !== "link" ? sizeStyles[size] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </button>
  );
}
