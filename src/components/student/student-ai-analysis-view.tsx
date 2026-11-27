"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";

export interface ITopicStat {
  topic_id?: string;
  topic_name: string;
  total_questions: number;
  total_wrong: number;
  wrong_rate: number;
  status: "weak" | "average" | "good";
}

export interface IStudentLongTermStats {
  totalAttempts: number;
  averageScore: number;
  totalQuestions: number;
  accuracyRate: number;
  weakTopics: ITopicStat[];
  strongTopics: ITopicStat[];
  recentAttempts: Array<{
    id: string;
    title: string;
    score: number;
    totalCorrect: number;
    totalWrong: number;
    date: string;
  }>;
}

interface StudentAiAnalysisViewProps {
  stats: IStudentLongTermStats;
  initialAttemptId?: string;
  initialPrompt?: string;
}

export default function StudentAiAnalysisView({
  stats,
  initialAttemptId,
  initialPrompt,
}: StudentAiAnalysisViewProps) {
  const openFloatingAi = (
    prompt: string,
    contextType: "attempt" | "general" = "general",
    contextId?: string
  ) => {
    window.dispatchEvent(
      new CustomEvent("open-ai-agent-chat", {
        detail: { prompt, contextType, contextId },
      })
    );
  };

  // Nếu được điều hướng từ trang chi tiết bài làm (?attemptId=...&q=...), tự mở bong bóng chat góc phải
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if ((initialPrompt || initialAttemptId) && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      const promptToSend =
        initialPrompt ||
        `Hãy phân tích sâu các câu tôi đã làm sai trong bài làm (Mã: ${initialAttemptId}) và hướng dẫn cách khắc phục từng dạng bài.`;
      const timer = setTimeout(() => {
        openFloatingAi(
          promptToSend,
          initialAttemptId ? "attempt" : "general",
          initialAttemptId
        );
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialAttemptId, initialPrompt]);

  const handleAskAgentAboutTopic = (topicName: string) => {
    openFloatingAi(
      `Tôi đang gặp khó khăn ở chuyên đề "${topicName}". Hãy phân tích nguyên nhân học sinh hay mất điểm ở phần này, nhắc lại lý thuyết trọng tâm và cho tôi 1 bài tập ví dụ kèm lời giải chi tiết.`
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Thanh trạng thái đồng bộ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center text-xs text-slate-600 dark:text-slate-300 gap-2 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Hệ thống tự động cập nhật kết quả phân tích sau mỗi bài thi & tự luyện</span>
        </div>
        <button
          type="button"
          onClick={() =>
            openFloatingAi(
              "Hãy tổng hợp giúp tôi bức tranh toàn cảnh về điểm mạnh, lỗ hổng kiến thức và gợi ý lộ trình ôn tập tiếp theo dựa trên kết quả của tôi."
            )
          }
          className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/70 dark:border-indigo-800/70 transition cursor-pointer flex items-center gap-1.5"
        >
          <span>💬</span>
          <span>Mở Trợ Lý AI Phân Tích Sâu</span>
        </button>
      </div>

      {/* 4 Thống kê tổng quan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số lượt làm</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.totalAttempts} <span className="text-sm font-normal text-slate-400">bài</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Đã nộp và chấm điểm</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Điểm trung bình</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.averageScore.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 10</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Toàn bộ quá trình ôn tập</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tỷ lệ chính xác</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.accuracyRate.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.totalQuestions} câu hỏi đã giải
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số lỗ hổng phát hiện</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {stats.weakTopics.length} <span className="text-sm font-normal text-slate-400">chuyên đề</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Cần tập trung củng cố</div>
        </div>
      </div>

      {/* Phân tích Lỗ hổng kiến thức xuyên suốt */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lỗ hổng cần bù đắp */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-rose-100 dark:border-rose-950/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600">
                🎯
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Lỗ Hổng Kiến Thức Cần Bù Đắp
                </h3>
                <p className="text-xs text-slate-500">Các chuyên đề có tỷ lệ làm sai cao nhất</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-900">
              {stats.weakTopics.length} phần yếu
            </span>
          </div>

          {stats.weakTopics.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl text-slate-500 text-sm">
              🎉 Tuyệt vời! Bạn chưa có chuyên đề nào có tỷ lệ sai vượt mức cảnh báo. Hãy tiếp tục duy trì phong độ!
            </div>
          ) : (
            <div className="space-y-3">
              {stats.weakTopics.map((topic, i) => (
                <div
                  key={i}
                  className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                      {topic.topic_name}
                    </div>
                    <div className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
                      <span>Sai {topic.total_wrong}/{topic.total_questions} câu</span>
                      <span>•</span>
                      <span>Tỷ lệ sai {topic.wrong_rate.toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {topic.topic_id && (
                      <Link
                        href={`/student/practice?topicId=${topic.topic_id}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-sm"
                      >
                        <span>Luyện tập ngay</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAskAgentAboutTopic(topic.topic_name)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Hỏi AI cách ôn</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Điểm mạnh đã nắm chắc */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-950/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                🌟
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Điểm Mạnh Đã Nắm Rất Chắc
                </h3>
                <p className="text-xs text-slate-500">Các phần kiến thức làm bài chính xác cao</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-900">
              {stats.strongTopics.length} chuyên đề
            </span>
          </div>

          {stats.strongTopics.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl text-slate-500 text-sm">
              Hãy tiếp tục làm thêm bài thi để AI nhận diện rõ các thế mạnh vượt trội của bạn.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.strongTopics.map((topic, i) => (
                <div
                  key={i}
                  className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                      {topic.topic_name}
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Chính xác {(100 - topic.wrong_rate).toFixed(0)}% ({topic.total_questions - topic.total_wrong}/{topic.total_questions} câu)
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-md">
                    Nắm vững
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lịch sử bài làm gần nhất */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4">
          Lịch Sử Bài Làm Đã Nộp Gần Đây
        </h3>
        {stats.recentAttempts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Bạn chưa có lượt làm bài nào. Hãy vào mục Luyện đề trắc nghiệm để bắt đầu ôn thi!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recentAttempts.map((att) => (
              <div key={att.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                    {att.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {att.date} • Đúng {att.totalCorrect}/{att.totalCorrect + att.totalWrong} câu
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                      {att.score.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">/10</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openFloatingAi(
                        `Hãy phân tích chi tiết kết quả bài làm "${att.title}" (Mã: ${att.id}) giúp tôi, chỉ ra những câu tôi đã làm sai và cách ôn tập bổ sung.`,
                        "attempt",
                        att.id
                      )
                    }
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold transition cursor-pointer"
                  >
                    Hỏi AI bài này
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
