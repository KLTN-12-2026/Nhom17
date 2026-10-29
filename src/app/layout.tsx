import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI-Quizz — Nền Tảng Luyện Thi Trắc Nghiệm Cấp 3 & ĐGNL Tích Hợp AI",
  description:
    "Hệ thống luyện thi trắc nghiệm THPT Quốc Gia (Lớp 10, 11, 12) & Đánh giá năng lực tích hợp trí tuệ nhân tạo Gemini 1.5. Tự động sinh câu hỏi, giám sát thi trực tuyến và chẩn đoán lỗ hổng kiến thức cho học sinh.",
  icons: {
    icon: "/favicon.ico",
  },
  keywords: [
    "luyện thi cấp 3",
    "ôn thi THPT quốc gia",
    "thi thử trắc nghiệm online",
    "đánh giá năng lực",
    "toán 12",
    "vật lý 12",
    "tiếng anh thpt",
    "trắc nghiệm AI",
  ],
  authors: [{ name: "AI-Quizz Education" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased scroll-smooth`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/20 selection:text-blue-600">
        {children}
      </body>
    </html>
  );
}
