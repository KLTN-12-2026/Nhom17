import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { User } from "@/models/User";
import { resetPasswordSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  await connectDB();
  const now = new Date();
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const resetToken = await PasswordResetToken.findOneAndUpdate(
    {
      token_hash: tokenHash,
      expires_at: { $gt: now },
      used_at: null,
    },
    { $set: { used_at: now } },
    { new: true }
  );

  if (!resetToken) {
    return NextResponse.json(
      { message: "The reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const userUpdate = await User.updateOne(
    { _id: resetToken.user_id, status: { $ne: "disabled" } },
    { $set: { password: passwordHash } }
  );

  if (userUpdate.matchedCount !== 1) {
    return NextResponse.json(
      { message: "The reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  await PasswordResetToken.deleteMany({ user_id: resetToken.user_id });

  return NextResponse.json({ message: "Password updated successfully." });
}
