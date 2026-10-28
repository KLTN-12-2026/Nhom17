//src\app\api\auth\forgot-password\route.ts
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { User } from "@/models/User";

export const runtime = "nodejs";

const genericResponse = {
  message:
    "If an account exists with this email, password reset instructions will be sent.",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid email address" },
      { status: 400 },
    );
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new Error("APP_URL is not configured");
  }

  const parsedAppUrl = new URL(appUrl);
  if (!["http:", "https:"].includes(parsedAppUrl.protocol)) {
    throw new Error("APP_URL must use HTTP or HTTPS");
  }

  await connectDB();
  const user = await User.findOne({
    email: parsed.data.email,
    status: { $ne: "disabled" },
  }).select("_id email");

  if (!user) {
    return NextResponse.json(genericResponse, { status: 202 });
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await PasswordResetToken.deleteMany({
    user_id: user._id,
    used_at: null,
  });

  await PasswordResetToken.create({
    user_id: user._id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 20 * 60 * 1000),
  });

  const resetUrl = new URL("/auth/reset-password", parsedAppUrl);
  resetUrl.searchParams.set("token", rawToken);

  try {
    await sendPasswordResetEmail(user.email, resetUrl.toString());
  } catch (error) {
    try {
      await PasswordResetToken.deleteOne({ token_hash: tokenHash });
    } catch (cleanupError) {
      console.error(
        "Failed to remove unused password reset token",
        cleanupError,
      );
    }
    console.error(
      "Password reset email delivery failed",
      error instanceof Error ? error.message : "Unknown SMTP error",
    );
  }

  return NextResponse.json(genericResponse, { status: 202 });
}
