import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Trắc Nghiệm AI — Nền Tảng Thi Trắc Nghiệm Trực Tuyến Tích Hợp AI | DTU",
    template: "%s | Trắc Nghiệm AI",
  },
  description:
    "Hệ thống khảo thí và luyện thi trắc nghiệm thông minh tích hợp Google Gemini AI, giám sát phòng thi trực tuyến thời gian thực và phân tích lộ trình ôn tập cá nhân hóa. Khóa luận tốt nghiệp Đại học Duy Tân - Nhóm 17.",
  keywords: [
    "Thi trắc nghiệm AI",
    "Trắc Nghiệm AI DTU",
    "Đại học Duy Tân",
    "Gemini 1.5 AI Quiz",
    "Giám sát thi online",
    "Khóa luận tốt nghiệp Nhóm 17",
  ],
  authors: [{ name: "Nhóm 17 — Khoa CNTT Trường Đại học Duy Tân" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/20 selection:text-blue-600">
        {children}
      </body>
    </html>
  );
}
