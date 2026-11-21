"use client";

import React, { useState } from "react";
import AgentChatbox from "@/components/ai-agent/agent-chatbox";

export interface IManagedExamSummary {
  id: string;
  title: string;
  totalAttempts: number;
  averageScore: number;
  passScore: number;
  isPublished: boolean;
}

interface InstructorAiAssistantViewProps {
  exams: IManagedExamSummary[];
  initialExamId?: string;
}

export default function InstructorAiAssistantView({
  exams,
  initialExamId,
}: InstructorAiAssistantViewProps) {
  const [selectedExamId, setSelectedExamId] = useState<string>(
    initialExamId || (exams.length > 0 ? exams[0].id : "")
  );

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const teacherSuggestedPrompts = selectedExam
    ? [
        `Phân tích phổ điểm và tổng hợp kiến thức học sinh còn yếu ở đề "${selectedExam.title}"`,
        `Cho tôi biết những câu hỏi có tỷ lệ sai nhiều nhất trong đề "${selectedExam.title}"`,
        `Gợi ý phương pháp sư phạm giúp học sinh tiếp thu tốt hơn các câu hỏi bị sai nhiều`,
        `Tôi cần phân tích bài làm của một học sinh cụ thể trong đề này`,
      ]
    : [
        "Gợi ý phương pháp truyền đạt phần Tích phân và Hình không gian cho học sinh lớp 12",
        "Cách giải thích bản chất hình học của đạo hàm để học sinh dễ hiểu nhất",
        "Hướng dẫn xây dựng thang đo câu hỏi theo chuẩn ma trận đề thi tốt nghiệp THPT",
      ];

  return (
    <div className="space-y-6">
      {/* Khung lựa chọn đề thi để phân tích */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Chọn Đề Thi Cần Trợ Lý AI Phân Tích & Hỗ Trợ
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            AI sẽ tự động đọc dữ liệu các lượt làm bài của đề thi này từ MongoDB để báo cáo cho Thầy/Cô.
          </p>
        </div>

        <div className="w-full md:w-auto min-w-[280px]">
          {exams.length === 0 ? (
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
              Chưa có đề thi nào do Thầy/Cô tạo.
            </div>
          ) : (
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} ({exam.totalAttempts} bài nộp - ĐTB: {exam.averageScore.toFixed(1)})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Hiển thị tóm tắt nhanh về đề thi được chọn */}
      {selectedExam && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs">
          <div>
            <span className="text-slate-400 block">Đề thi hiện tại:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
              {selectedExam.title}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Số bài đã nộp:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 block">
              {selectedExam.totalAttempts} lượt nộp
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Điểm trung bình:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
              {selectedExam.averageScore.toFixed(1)} / 10
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Trạng thái phát hành:</span>
            <span
              className={`font-bold inline-block px-2 py-0.5 rounded-full text-[10px] ${
                selectedExam.isPublished
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {selectedExam.isPublished ? "Đã công bố" : "Bản nháp"}
            </span>
          </div>
        </div>
      )}

      {/* Chatbox AI Agent dành cho Giáo Viên */}
      <AgentChatbox
        key={selectedExamId || "general"}
        role="teacher"
        title="Trợ Lý Sư Phạm & Giảng Dạy AI"
        subtitle="Hỗ trợ phân tích phổ điểm lớp học, phát hiện lỗ hổng và tư vấn phương pháp sư phạm"
        initialContextType={selectedExamId ? "exam" : "general"}
        initialContextId={selectedExamId || undefined}
        suggestedPrompts={teacherSuggestedPrompts}
      />
    </div>
  );
}
