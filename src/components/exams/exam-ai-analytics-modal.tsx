"use client";

import React, { useState, useEffect } from "react";
import { IInstructorAiReportResult } from "@/lib/ai-analysis-service";

interface ExamAiAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string | null;
  examTitle?: string;
}

export default function ExamAiAnalyticsModal({
  isOpen,
  onClose,
  examId,
  examTitle,
}: ExamAiAnalyticsModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<{
    exam?: {
      title: string;
      duration_minutes: number;
      total_questions: number;
      pass_score: number;
      max_score: number;
    };
    analytics?: IInstructorAiReportResult;
  } | null>(null);

  // Khóa cuộn trang nền khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Tải dữ liệu báo cáo chẩn đoán AI
  useEffect(() => {
    let isCancelled = false;

    async function loadReport() {
      if (!isOpen || !examId) return;
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/instructor/exams/${examId}/ai-analytics`);
        const resData = await res.json();
        if (!isCancelled) {
          if (resData.success) {
            setData(resData);
          } else {
            setError(resData.message || "Không thể tải báo cáo phân tích AI.");
          }
        }
      } catch {
        if (!isCancelled) {
          setError("Lỗi kết nối máy chủ khi tải báo cáo chẩn đoán AI.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, examId]);

  if (!isOpen) return null;

  const analytics = data?.analytics;
  const summary = analytics?.class_summary;
  const report = analytics?.ai_pedagogical_report;
  const topics = analytics?.topic_diagnostics || [];
  const topQuestions = analytics?.top_failed_questions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs font-sans overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[92dvh] rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
        {/* ========================================================================= */}
        {/* HEADER MODAL */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <span className="text-lg">📊</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate sm:whitespace-normal">
                  Chẩn Đoán Lớp Học & Báo Cáo AI
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shrink-0">
                  Dành cho Giáo viên
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Đề thi: <strong className="text-indigo-600 dark:text-indigo-400">{data?.exam?.title || examTitle || "Đề kiểm tra"}</strong> • Tổng hợp mảng kiến thức sai và đề xuất củng cố
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer shrink-0 ml-2"
          >
            ✕
          </button>
        </div>

        {/* ========================================================================= */}
        {/* BODY MODAL */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-6 overscroll-contain">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-xl animate-spin">
                ⚙️
              </div>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Đang tổng hợp dữ liệu bài làm của học sinh và phân tích chẩn đoán...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && summary && (
            <>
              {/* 1. LƯỚI 4 THẺ THỐNG KÊ LỚP HỌC */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Học sinh đã nộp</span>
                  <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {summary.total_candidates} <span className="text-xs font-normal text-slate-500">em</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Điểm trung bình</span>
                  <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {summary.average_score} <span className="text-xs font-normal text-slate-500">/ 10đ</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phổ điểm</span>
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {summary.lowest_score}đ ➔ {summary.highest_score}đ
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tỷ lệ đạt chuẩn</span>
                  <span className={`text-lg sm:text-xl font-black ${
                    summary.pass_rate >= 70 ? "text-emerald-600" : summary.pass_rate >= 50 ? "text-amber-600" : "text-rose-600"
                  }`}>
                    {summary.pass_rate}%
                  </span>
                </div>
              </div>

              {/* 2. KHỐI NHẬN ĐỊNH SƯ PHẠM CỦA AI */}
              {report && (
                <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-pink-50/50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <h3 className="text-sm font-extrabold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                      Cố Vấn Sư Phạm AI: Chẩn Đoán Lỗ Hổng & Đề Xuất Củng Cố
                    </h3>
                  </div>

                  {/* Đánh giá tổng quan */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                    <strong className="text-indigo-700 dark:text-indigo-400 block mb-1">
                      📌 Đánh giá tổng quan năng lực lớp:
                    </strong>
                    {report.general_assessment}
                  </div>

                  {/* Hiểu lầm phổ biến */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-purple-100 dark:border-purple-900/40 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                    <strong className="text-purple-700 dark:text-purple-400 block mb-1">
                      ⚠️ Những bẫy đề & hiểu lầm kiến thức học sinh hay mắc phải:
                    </strong>
                    {report.common_misconceptions}
                  </div>

                  {/* Chiến lược khắc phục */}
                  {report.remedial_strategies && report.remedial_strategies.length > 0 && (
                    <div className="space-y-2">
                      <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                        💡 Đề xuất hành động sư phạm cho giáo viên:
                      </strong>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {report.remedial_strategies.map((strat, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
                          >
                            <span className="w-5 h-5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                              {sIdx + 1}
                            </span>
                            <span>{strat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chuyên đề ưu tiên củng cố */}
                  {report.focus_topics_for_next_class && report.focus_topics_for_next_class.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        🎯 Chuyên đề ưu tiên ôn lại:
                      </span>
                      {report.focus_topics_for_next_class.map((top, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-bold"
                        >
                          {top}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. MA TRẬN CHUYÊN ĐỀ HỌC SINH SAI NHIỀU */}
              {topics.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span>📉</span>
                      <span>Tỷ Lệ Sai Theo Từng Mảng Kiến Thức ({topics.length} chuyên đề)</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Sắp xếp theo mức độ cần củng cố
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {topics.map((t) => (
                      <div
                        key={t.topic_id}
                        className={`p-3.5 rounded-2xl border transition ${
                          t.severity === "high"
                            ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"
                            : t.severity === "medium"
                            ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                            : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 line-clamp-1">
                            {t.topic_name}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                              t.severity === "high"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : t.severity === "medium"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {t.error_rate}% sai
                          </span>
                        </div>

                        {/* Thanh đo % sai */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              t.severity === "high"
                                ? "bg-rose-500"
                                : t.severity === "medium"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${t.error_rate}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                          <span>Sai: <strong>{t.total_wrong}</strong> lượt</span>
                          <span>Tổng làm: <strong>{t.total_answers}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. TOP CÂU HỎI SAI NHIỀU NHẤT TRONG ĐỀ THI */}
              {topQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span>🎯</span>
                      <span>Top Câu Hỏi Có Tỷ Lệ Học Sinh Sai Cao Nhất (Cần chữa trên lớp)</span>
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {topQuestions.map((q, qIdx) => (
                      <div
                        key={q.question_id || qIdx}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-2xs space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
                              #{qIdx + 1}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {q.topic_name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                q.difficulty_level === "easy"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : q.difficulty_level === "hard"
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-amber-50 text-amber-600"
                              }`}
                            >
                              {q.difficulty_level === "easy" ? "Dễ" : q.difficulty_level === "hard" ? "Khó" : "Vừa"}
                            </span>
                          </div>

                          <span className="text-xs font-extrabold text-rose-600">
                            {q.wrong_percentage}% học sinh sai ({q.wrong_count} em)
                          </span>
                        </div>

                        <p className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-relaxed break-words">
                          {q.content}
                        </p>

                        {/* Các phương án học sinh hay chọn nhầm */}
                        {q.common_wrong_options && q.common_wrong_options.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 text-[11px] text-rose-800 dark:text-rose-300 space-y-1">
                            <span className="font-bold block">Phương án bẫy nhiều em chọn nhầm nhất:</span>
                            {q.common_wrong_options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-1.5">
                                <span className="font-bold">[{opt.option_label}]:</span>
                                <span className="truncate flex-1">{opt.content}</span>
                                <span className="font-semibold text-rose-600 shrink-0">({opt.count} em chọn)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER MODAL */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {examId ? (
            <button
              type="button"
              onClick={() => {
                const targetExamId = examId;
                const targetTitle = data?.exam?.title || examTitle || "đề thi này";
                onClose();
                window.dispatchEvent(
                  new CustomEvent("open-ai-agent-chat", {
                    detail: {
                      prompt: `Hãy phân tích chi tiết phổ điểm, các câu hỏi học sinh làm sai nhiều nhất và gợi ý phương pháp giảng dạy cho đề thi "${targetTitle}" (Mã đề: ${targetExamId}).`,
                      contextType: "exam",
                      contextId: targetExamId,
                    },
                  })
                );
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>💬 Mở Trợ Lý AI Giảng Dạy về đề này</span>
              <span>➔</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 text-center sm:text-left">
              Báo cáo tự động tổng hợp từ dữ liệu bài thi học sinh
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold text-xs shadow-xs transition cursor-pointer text-center"
          >
            Đóng Báo Cáo
          </button>
        </div>
      </div>
    </div>
  );
}
