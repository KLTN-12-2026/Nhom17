"use client";

import React, { useState, useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Message {
  role: "user" | "model";
  content: string;
  tool_calls?: Array<{
    tool_name: string;
    arguments: Record<string, unknown>;
  }>;
  timestamp?: string | Date;
}

interface ConversationItem {
  _id: string;
  title: string;
  updatedAt: string;
  context_type?: string;
  context_id?: string;
}

interface AgentChatboxProps {
  role: "student" | "teacher";
  title: string;
  subtitle: string;
  initialContextType?: "exam" | "attempt" | "general";
  initialContextId?: string;
  initialPrompt?: string;
  suggestedPrompts: string[];
}

export default function AgentChatbox({
  role,
  title,
  subtitle,
  initialContextType = "general",
  initialContextId,
  initialPrompt,
  suggestedPrompts,
}: AgentChatboxProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isToolCalling, setIsToolCalling] = useState<boolean>(false);
  const [toolNameDisplay, setToolNameDisplay] = useState<string>("");
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isToolCalling]);

  useEffect(() => {
    let ignore = false;
    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/ai-agent/conversations");
        const data = await res.json();
        if (!ignore && data.success && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách hội thoại:", err);
      }
    };

    fetchConversations();
    return () => {
      ignore = true;
    };
  }, [role]);

  // Tải lại danh sách hội thoại khi cần
  const reloadConversations = async () => {
    try {
      const res = await fetch("/api/ai-agent/conversations");
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách hội thoại:", err);
    }
  };

  // Tải chi tiết cuộc hội thoại khi chọn
  const selectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setShowHistory(false);
    setError(null);
    try {
      setIsLoading(true);
      const res = await fetch(`/api/ai-agent/conversations/${convId}`);
      const data = await res.json();
      if (data.success && data.conversation) {
        setMessages(data.conversation.messages || []);
      }
    } catch {
      setError("Không thể tải nội dung cuộc hội thoại.");
    } finally {
      setIsLoading(false);
    }
  };

  // Tạo cuộc hội thoại mới
  const handleStartNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    setInputMessage("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Xóa hội thoại
  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa phiên trò chuyện này?")) return;

    try {
      const res = await fetch(`/api/ai-agent/conversations/${convId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c._id !== convId));
        if (activeConversationId === convId) {
          handleStartNewChat();
        }
      }
    } catch (err) {
      console.error("Lỗi khi xóa hội thoại:", err);
    }
  };

  // Gửi tin nhắn
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setError(null);
    setInputMessage("");

    // Cập nhật UI ngay với tin nhắn của người dùng
    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversation_id: activeConversationId || undefined,
          context_type: initialContextType,
          context_id: initialContextId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Đã xảy ra lỗi khi trao đổi với AI.");
      }

      // Cập nhật conversation ID nếu là chat mới
      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId);
        reloadConversations();
      }

      // Thêm câu trả lời của AI vào danh sách
      const agentMsg: Message = {
        role: "model",
        content: data.message,
        tool_calls: data.toolCalls?.map((tc: { name: string; args: Record<string, unknown> }) => ({
          tool_name: tc.name,
          arguments: tc.args,
        })),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(errMsg);
    } finally {
      setIsLoading(false);
      setIsToolCalling(false);
      setToolNameDisplay("");
    }
  };

  // Tự động kích hoạt initialPrompt nếu có
  const initialPromptTriggered = useRef(false);
  useEffect(() => {
    if (initialPrompt && !initialPromptTriggered.current) {
      initialPromptTriggered.current = true;
      handleSendMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  // Phân tích hiển thị tên công cụ thân thiện
  const formatToolName = (toolName: string) => {
    const dict: Record<string, string> = {
      analyzeMyLearningResults: "Phân tích kết quả học tập cá nhân",
      getMyExamHistory: "Truy xuất lịch sử làm bài",
      getMyExamResult: "Lấy chi tiết kết quả bài thi",
      explainMyAnswer: "Phân tích câu hỏi & đáp án",
      searchLearningKnowledge: "Tra cứu cơ sở kiến thức & bài giảng",
      analyzeExamResults: "Phân tích phổ điểm đề thi",
      getExamStatistics: "Tổng hợp thống kê lớp học",
      getMostIncorrectQuestions: "Phát hiện các câu hỏi sai nhiều nhất",
      analyzeStudentPerformance: "Đánh giá chi tiết năng lực học viên",
      explainQuestion: "Tra cứu câu hỏi ngân hàng",
      teachingAssistant: "Tư vấn phương pháp sư phạm",
    };
    return dict[toolName] || toolName;
  };

  // Helper render công thức toán học với KaTeX an toàn
  const renderKatex = (latex: string, isBlock: boolean) => {
    try {
      const clean = latex.trim();
      return katex.renderToString(clean, {
        displayMode: isBlock,
        throwOnError: false,
      });
    } catch {
      return latex;
    }
  };

  // Helper render văn bản markdown kết hợp công thức toán học KaTeX
  const renderFormattedText = (content: string) => {
    // Chuẩn hóa tách các khối $$...$$ để đứng riêng dòng
    const normalized = content.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_m, math) => {
      return `\n$$${math.trim()}$$\n`;
    });

    const lines = normalized.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Công thức toán học dạng khối $$...$$
      if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length >= 4) {
        const mathContent = trimmed.slice(2, -2).trim();
        const html = renderKatex(mathContent, true);
        return (
          <div
            key={idx}
            className="my-3 py-2.5 px-4 overflow-x-auto text-center bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 shadow-2xs"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // Tiêu đề ###
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="font-bold text-base text-slate-900 dark:text-white mt-3 mb-1">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="font-bold text-lg text-slate-900 dark:text-white mt-4 mb-2">
            {line.replace("## ", "")}
          </h3>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h2 key={idx} className="font-black text-xl text-slate-900 dark:text-white mt-4 mb-2">
            {line.replace("# ", "")}
          </h2>
        );
      }

      // Danh sách gạch đầu dòng
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const itemText = line.trim().substring(2);
        return (
          <div key={idx} className="flex items-start gap-2 ml-2 my-1 text-sm leading-relaxed">
            <span className="text-emerald-500 font-bold mt-0.5">•</span>
            <span>{renderInlineMarkdown(itemText)}</span>
          </div>
        );
      }

      // Blockquote >
      if (line.startsWith("> ")) {
        return (
          <blockquote
            key={idx}
            className="border-l-4 border-indigo-400 pl-3 py-1 my-2 bg-indigo-50/50 dark:bg-indigo-950/30 text-slate-700 dark:text-slate-300 italic text-sm rounded-r"
          >
            {renderInlineMarkdown(line.replace("> ", ""))}
          </blockquote>
        );
      }

      // Dòng trống
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      // Dòng văn bản bình thường
      return (
        <p key={idx} className="my-1 text-sm leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Helper render các cú pháp inline như **bold**, `code` và $inline math$
  const renderInlineMarkdown = (text: string) => {
    // Tách phần **bold**, `code`, và $inline math$
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\$[^$\n]+?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-xs rounded border border-slate-200 dark:border-slate-700"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("$") && part.endsWith("$") && part.length >= 2) {
        const mathContent = part.slice(1, -1).trim();
        const html = renderKatex(mathContent, false);
        return (
          <span
            key={i}
            className="inline-block px-1 align-baseline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[750px] max-h-[82vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-wide text-white">{title}</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Agent Active
              </span>
            </div>
            <p className="text-xs text-slate-300/90">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút xem lịch sử hội thoại */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            title="Lịch sử cuộc trò chuyện"
            className={`p-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
              showHistory
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="hidden sm:inline">Lịch sử ({conversations.length})</span>
          </button>

          {/* Nút Tạo đoạn chat mới */}
          <button
            onClick={handleStartNewChat}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Đoạn chat mới</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Lịch sử Sidebar Drawer */}
        {showHistory && (
          <div className="w-72 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Các phiên trò chuyện
              </span>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-900">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">Chưa có phiên trò chuyện nào trước đây.</div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => selectConversation(c._id)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition text-xs ${
                      activeConversationId === c._id
                        ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <div className="truncate font-medium">{c.title || "Cuộc trò chuyện"}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(c.updatedAt).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(e, c._id)}
                      title="Xóa"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 rounded transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Khung chat chính */}
        <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
          {/* Danh sách tin nhắn */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="max-w-xl mx-auto py-8 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {role === "student"
                    ? "Bạn cần AI hỗ trợ bài tập hay chẩn đoán lỗ hổng kiến thức?"
                    : "Chào Thầy/Cô! Trợ lý AI sẵn sàng phân tích phổ điểm & phương pháp giảng dạy."}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {role === "student"
                    ? "Agent có khả năng truy xuất lịch sử bài thi, chỉ ra chuyên đề bạn yếu nhất và giải thích từng câu hỏi dễ hiểu."
                    : "Agent hỗ trợ tổng hợp thống kê đề thi, phát hiện câu hỏi nhiều học sinh sai và đề xuất hướng giảng bài hiệu quả."}
                </p>

                {/* Gợi ý câu hỏi */}
                <div className="pt-3">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2.5">
                    💡 Câu hỏi gợi ý nhanh:
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestedPrompts.map((promptText, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(promptText)}
                        className="text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition text-left shadow-sm"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "model" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/80 dark:border-slate-700/80"
                  }`}
                >
                  {/* Tool Call Badges nếu có */}
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Công cụ AI đã dùng:
                      </span>
                      {msg.tool_calls.map((tc, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium"
                        >
                          {formatToolName(tc.tool_name)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Nội dung tin nhắn */}
                  {msg.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="prose-sm dark:prose-invert max-w-none">
                      {renderFormattedText(msg.content)}
                    </div>
                  )}

                  {/* Timestamp */}
                  {msg.timestamp && (
                    <div
                      className={`text-[9px] mt-1.5 text-right ${
                        msg.role === "user" ? "text-indigo-200" : "text-slate-400"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 mt-1 font-bold text-xs">
                    Tôi
                  </div>
                )}
              </div>
            ))}

            {/* Trạng thái đang suy nghĩ & gọi tool */}
            {isLoading && (
              <div className="flex gap-3 justify-start animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shrink-0 mt-1">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    ></path>
                  </svg>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                    <span>
                      {isToolCalling
                        ? `AI đang truy xuất dữ liệu: ${toolNameDisplay || "Database MongoDB"}...`
                        : "AI đang suy nghĩ và tổng hợp câu trả lời..."}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Hệ thống đang đối chiếu dữ liệu điểm số và kiến thức chuẩn xác...
                  </div>
                </div>
              </div>
            )}

            {/* Thông báo lỗi nếu có */}
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold underline ml-2"
                >
                  Bỏ qua
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập tin nhắn */}
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    role === "student"
                      ? "Hỏi về lỗ hổng, bài tập, công thức hoặc so sánh kết quả học tập... (Enter để gửi)"
                      : "Yêu cầu phân tích đề thi, câu hỏi sai nhiều hoặc phương pháp sư phạm... (Enter để gửi)"
                  }
                  rows={2}
                  disabled={isLoading}
                  className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-800 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className={`h-11 px-4 rounded-xl flex items-center justify-center font-semibold text-white transition shadow-md shrink-0 ${
                  isLoading || !inputMessage.trim()
                    ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-400"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25 active:scale-95"
                }`}
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
              <span>Shift + Enter để xuống dòng</span>
              <span>Được bảo vệ bởi Gemini AI & RBAC Rules</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
