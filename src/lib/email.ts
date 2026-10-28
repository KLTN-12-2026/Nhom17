//src\lib\email.ts
import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !Number.isInteger(port) || !user || !pass || !from) {
    throw new Error("SMTP environment variables are not configured");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: "Reset your Adaptive Quiz password",
    text: `We received a request to reset your password. Open this link within 20 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 20 minutes. If you did not request this, you can ignore this email.</p>`,
  });
}
