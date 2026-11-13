"use client";

import React, { useState, useEffect } from "react";
import { ExamDataToEdit } from "./exam-creator-modal";

interface ExamDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamDataToEdit | null;
  onStartPractice?: (exam: ExamDataToEdit) => void;
  onEditExam?: (exam: ExamDataToEdit) => void;
}

export default function ExamDetailsModal({
  isOpen,
  onClose,
  exam,
  onStartPractice,
  onEditExam,
}: ExamDetailsModalProps) {
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [showOnlyAnswers, setShowOnlyAnswers] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !exam) return null;

  const subjectName = typeof exam.subject_id === "object"
    ? exam.subject_id?.subject_name
    : "Chung";

  const questions = exam.questions || [];

  // Thống kê độ khó
  let easyCount = 0;
  let mediumCount = 0;
  let hardCount = 0;
  let totalScore = 0;

  questions.forEach((q) => {
    totalScore += q.question_score || 0;
    const diff = q.question_snapshot?.difficulty_level;
    if (diff === "easy") easyCount++;
    else if (diff === "hard") hardCount++;
    else mediumCount++;
  });

  const filteredQuestions = questions.filter((q) => {
    if (filterDifficulty !== "all" && q.question_snapshot?.difficulty_level !== filterDifficulty) {
      return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs font-sans overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-800 w-full max-w-4xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[92dvh] rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
        {/* ========================================================================= */}
        {/* HEADER MODAL */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate sm:whitespace-normal">
                  {exam.title}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                    exam.is_published
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800"
                      : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {exam.is_published ? "Đã Xuất Bản" : "Bản Nháp"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Ngân hàng môn: <strong className="text-blue-600 dark:text-blue-400">{subjectName}</strong> • {questions.length} câu hỏi • {exam.duration_minutes} phút
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
        {/* BANNER THÔNG TIN & CẤU HÌNH ĐỀ */}
        {/* ========================================================================= */}
        <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-4">
          {/* Lưới 4 thông số */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thời gian</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{exam.duration_minutes} phút</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng số câu</span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{questions.length} câu</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thang điểm</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{parseFloat(totalScore.toFixed(2))} / {exam.max_score} đ</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Điểm đạt chuẩn</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{exam.pass_score} đ</span>
            </div>
          </div>

          {/* Các cờ cấu hình (Badges) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
                  exam.shuffle_questions
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                    : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                }`}
              >
                <span>🔀</span>
                <span>{exam.shuffle_questions ? "Xáo câu hỏi: Bật" : "Xáo câu hỏi: Tắt"}</span>
              </span>

              <span
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
                  exam.shuffle_options
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                    : "bg-slate-100 text-slate-500 border-slate-200 dark:border-slate-800 dark:border-slate-700"
                }`}
              >
                <span>🔀</span>
                <span>{exam.shuffle_options ? "Xáo đáp án: Bật" : "Xáo đáp án: Tắt"}</span>
              </span>

              <span
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
                  exam.allow_view_result_immediately
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                }`}
              >
                <span>👁️</span>
                <span>{exam.allow_view_result_immediately ? "Xem đáp án sau thi: Bật" : "Xem đáp án: Tắt"}</span>
              </span>
            </div>

            {/* Phân bố độ khó */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                🟢 Dễ: {easyCount}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                🟡 Vừa: {mediumCount}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                🔴 Khó: {hardCount}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DANH SÁCH CHI TIẾT TỪNG CÂU HỎI */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4 overscroll-contain">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Danh Sách Câu Hỏi Trong Đề ({filteredQuestions.length} / {questions.length})
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
              >
                <option value="all">Mọi độ khó</option>
                <option value="easy">🟢 Mức Dễ</option>
                <option value="medium">🟡 Mức Vừa</option>
                <option value="hard">🔴 Mức Khó</option>
              </select>

              <button
                type="button"
                onClick={() => setShowOnlyAnswers(!showOnlyAnswers)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
                  showOnlyAnswers
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "border-slate-300 dark:border-slate-700 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {showOnlyAnswers ? "✓ Đang hiện đáp án đúng" : "Hiện đáp án đúng"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => {
              const snap = q.question_snapshot;
              if (!snap) return null;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs flex items-center justify-center">
                        {q.question_order || idx + 1}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          snap.difficulty_level === "easy"
                            ? "bg-emerald-50 text-emerald-600"
                            : snap.difficulty_level === "hard"
                              ? "bg-rose-50 text-rose-600"
                              : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {snap.difficulty_level === "easy" ? "Dễ" : snap.difficulty_level === "hard" ? "Khó" : "Vừa"}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded-md">
                      {q.question_score || 1} điểm
                    </span>
                  </div>

                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {snap.content}
                  </div>

                  {/* 4 đáp án */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {snap.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition ${
                          opt.is_correct
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                            opt.is_correct
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {opt.option_label}
                        </span>
                        <span className="flex-1">{opt.content}</span>
                        {opt.is_correct && (
                          <span className="text-emerald-600 font-bold text-xs">✓ Đáp án đúng</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Lời giải */}
                  {snap.explanation && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <strong className="text-slate-700 dark:text-slate-300">Lời giải chi tiết:</strong> {snap.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER ACTIONS */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-center"
          >
            Đóng
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {onEditExam && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditExam(exam);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Chỉnh Sửa Đề</span>
              </button>
            )}

            {onStartPractice && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartPractice(exam);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-medium text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>✍️ Thi Thử Ngay</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
