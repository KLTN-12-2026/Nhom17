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
    default: "EduAI Enterprise — Nền Tảng Đánh Giá & Khảo Thí Trực Tuyến AI",
    template: "%s | EduAI Enterprise",
  },
  description:
    "Hệ thống khảo thí trắc nghiệm thông minh thế hệ mới, tích hợp sinh đề tự động bằng AI, phòng thi trực tuyến thời gian thực và giám sát chống gian lận đa tầng.",
  keywords: [
    "Khảo thí trực tuyến",
    "Thi trắc nghiệm AI",
    "EduAI",
    "Giám sát thi online",
    "Sinh câu hỏi AI",
    "LMS Enterprise",
  ],
  authors: [{ name: "EduAI Systems Inc." }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
