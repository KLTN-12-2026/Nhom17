"use client";

import React, { useState, useEffect } from "react";
import AgentChatbox, { ExternalPromptPayload } from "./agent-chatbox";

interface OpenAiChatEventDetail {
  prompt: string;
  contextType?: "exam" | "attempt" | "general";
  contextId?: string;
}

const STUDENT_SUGGESTED_PROMPTS = [
  "Kết quả học tập của tôi hiện tại như thế nào?",
  "Tôi yếu nhất ở chuyên đề nào và cần cải thiện ra sao?",
  "So sánh kết quả các lần làm bài gần đây của tôi",
  "Giải thích giúp tôi phương pháp làm bài toán tích phân hàm ẩn",
  "Gợi ý lộ trình ôn thi môn Toán đạt từ 8 điểm trở lên",
];

const TEACHER_SUGGESTED_PROMPTS = [
  "Thống kê tình hình làm bài các đề thi tôi đã tạo",
  "Đề thi gần nhất của tôi có những câu nào học viên hay sai?",
  "Gợi ý cách giảng phần Tích phân dễ hiểu cho học sinh trung bình",
  "Học sinh thường mắc lỗi gì khi giải bài tập Hàm số?",
];

interface FloatingAiWidgetProps {
  role?: "student" | "teacher";
}

export default function FloatingAiWidget({ role = "student" }: FloatingAiWidgetProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [externalPrompt, setExternalPrompt] = useState<ExternalPromptPayload | null>(null);

  useEffect(() => {
    const handleOpenEvent = (event: Event) => {
      const customEvent = event as CustomEvent<OpenAiChatEventDetail>;
      const detail = customEvent.detail;
      setIsOpen(true);
      setHasInitialized(true);

      if (detail?.prompt) {
        setExternalPrompt({
          text: detail.prompt,
          contextType: detail.contextType || "general",
          contextId: detail.contextId,
          nonce: Date.now(),
        });
      }
    };

    window.addEventListener("open-ai-agent-chat", handleOpenEvent);
    return () => {
      window.removeEventListener("open-ai-agent-chat", handleOpenEvent);
    };
  }, []);

  const handleToggleOpen = () => {
    setHasInitialized(true);
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      data-floating-ai="true"
      className="fixed bottom-5 right-5 z-[60] flex flex-col items-end"
    >
      {/* Khung Chat Popup Nổi (giữ nguyên state khi thu gọn bằng CSS hidden sau lần mở đầu tiên) */}
      {(hasInitialized || isOpen) && (
        <div
          className={`${
            isOpen
              ? "flex animate-in fade-in slide-in-from-bottom-4 duration-200 mb-3"
              : "hidden"
          } transition-all duration-200 ${
            isExpanded
              ? "w-[calc(100vw-2.5rem)] sm:w-[680px] h-[720px] max-h-[85vh]"
              : "w-[calc(100vw-2.5rem)] sm:w-[430px] h-[580px] max-h-[80vh]"
          }`}
        >
          <AgentChatbox
            role={role}
            title={role === "teacher" ? "Trợ Lý AI Giảng Dạy" : "Trợ Lý AI Học Tập"}
            subtitle={
              role === "teacher"
                ? "Phân tích bài thi của đề bạn tạo & tư vấn sư phạm"
                : "Hỏi đáp kiến thức, phân tích bài thi & lỗ hổng"
            }
            suggestedPrompts={
              role === "teacher" ? TEACHER_SUGGESTED_PROMPTS : STUDENT_SUGGESTED_PROMPTS
            }
            externalPrompt={externalPrompt}
            isFloating={true}
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded((prev) => !prev)}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}

      {/* Nút Bong Bóng Chat ở góc dưới bên phải */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleToggleOpen}
          title={role === "teacher" ? "Mở Trợ Lý AI Giảng Dạy" : "Mở Trợ Lý AI Học Tập"}
          className="group relative flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/35 hover:shadow-indigo-600/50 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
        >
          {/* Chấm trạng thái hoạt động */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
          </span>

          <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>

          <span className="text-xs sm:text-sm font-bold tracking-wide pr-0.5">
            Trợ lý AI
          </span>
        </button>
      )}
    </div>
  );
}
