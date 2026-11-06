"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ExamDataToEdit, OptionItem } from "./exam-creator-modal";

interface ExamPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamDataToEdit | null;
}

interface PracticeQuestion {
  question_id: string;
  original_order: number;
  question_score: number;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation?: string;
  options: OptionItem[];
}

export default function ExamPracticeModal({
  isOpen,
  onClose,
  exam,
}: ExamPracticeModalProps) {
  // Trạng thái bài thi thử: "taking" (đang làm) | "submitted" (đã nộp, xem kết quả)
  const [examStatus, setExamStatus] = useState<"taking" | "submitted">("taking");

  // Danh sách câu hỏi sau khi đã xử lý xáo trộn (nếu có bật)
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Câu trả lời của giáo viên: Map question_id -> option_id hoặc option_label
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Đồng hồ đếm ngược (giây)
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Khởi tạo bài thi khi mở modal
  useEffect(() => {
    if (!exam || !isOpen) return;

    const rawQuestions = exam.questions || [];
    let processed: PracticeQuestion[] = rawQuestions.map((q, idx) => {
      const snap = q.question_snapshot;
      let opts = snap?.options ? [...snap.options] : [];

      // Xáo trộn đáp án nếu đề thi bật shuffle_options
      if (exam.shuffle_options) {
        opts = [...opts].sort(() => Math.random() - 0.5);
      }

      return {
        question_id: typeof q.question_id === "object" ? String(q.question_id?._id) : String(q.question_id),
        original_order: q.question_order || idx + 1,
        question_score: q.question_score || 1,
        content: snap?.content || "",
        difficulty_level: snap?.difficulty_level || "medium",
        explanation: snap?.explanation,
        options: opts,
      };
    });

    // Xáo trộn câu hỏi nếu đề thi bật shuffle_questions
    if (exam.shuffle_questions) {
      processed = [...processed].sort(() => Math.random() - 0.5);
    }

    setQuestions(processed);
    setCurrentIndex(0);
    setAnswers({});
    setSecondsRemaining((exam.duration_minutes || 45) * 60);
    setExamStatus("taking");
  }, [exam, isOpen]);

  // Đồng hồ đếm ngược chạy từng giây
  useEffect(() => {
    if (examStatus !== "taking" || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStatus, secondsRemaining]);

  // Định dạng thời gian MM:SS
  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [secondsRemaining]);

  const currentQ = questions[currentIndex];

  function handleSelectOption(qId: string, optIdOrLabel: string) {
    if (examStatus !== "taking") return;
    setAnswers((prev) => ({
      ...prev,
      [qId]: optIdOrLabel,
    }));
  }

  function handleClearAnswer(qId: string) {
    if (examStatus !== "taking") return;
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  }

  function handleSubmitTest() {
    if (examStatus === "taking") {
      setExamStatus("submitted");
    }
  }

  // Chấm điểm kết quả thi thử
  const testResult = useMemo(() => {
    let correctCount = 0;
    let earnedScore = 0;
    let totalScore = 0;

    questions.forEach((q) => {
      totalScore += q.question_score;
      const selected = answers[q.question_id];
      const correctOption = q.options.find((o) => o.is_correct);

      // So khớp đáp án theo option_id hoặc option_label
      if (
        correctOption &&
        (selected === correctOption.option_id || selected === correctOption.option_label)
      ) {
        correctCount++;
        earnedScore += q.question_score;
      }
    });

    const isPassed = earnedScore >= (exam?.pass_score || 5.0);

    return {
      correctCount,
      totalCount: questions.length,
      earnedScore: parseFloat(earnedScore.toFixed(2)),
      totalScore: parseFloat(totalScore.toFixed(2)),
      isPassed,
    };
  }, [questions, answers, exam?.pass_score]);

  if (!isOpen || !exam) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden animate-fade-in my-auto">
        {/* ========================================================================= */}
        {/* TOP BAR: THÔNG TIN BÀI THI & ĐỒNG HỒ */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              Chế Độ Thi Thử
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                {exam.title}
              </h2>
              <span className="text-[11px] text-slate-500">
                Mô phỏng trải nghiệm thực tế của học viên khi làm bài
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {examStatus === "taking" && (
              <div
                className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-sm font-black shadow-xs ${
                  secondsRemaining < 300
                    ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse"
                    : "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400"
                }`}
              >
                <span>⏱️</span>
                <span>{formattedTime}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BODY: MÀN HÌNH LÀM BÀI HOẶC BẢNG KẾT QUẢ */}
        {/* ========================================================================= */}
        {examStatus === "taking" ? (
          <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
            {/* Cột trái: Nội dung câu hỏi đang làm */}
            <div className="flex-1 space-y-5">
              {currentQ ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs">
                        Câu {currentIndex + 1} / {questions.length}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          currentQ.difficulty_level === "easy"
                            ? "bg-emerald-50 text-emerald-600"
                            : currentQ.difficulty_level === "hard"
                              ? "bg-rose-50 text-rose-600"
                              : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {currentQ.difficulty_level === "easy" ? "Dễ" : currentQ.difficulty_level === "hard" ? "Khó" : "Vừa"}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-slate-500">
                      Điểm: <strong className="text-blue-600">{currentQ.question_score} đ</strong>
                    </span>
                  </div>

                  {/* Nội dung câu hỏi */}
                  <div className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {currentQ.content}
                  </div>

                  {/* 4 phương án chọn */}
                  <div className="space-y-3 pt-2">
                    {currentQ.options.map((opt, oIdx) => {
                      const optKey = opt.option_id || opt.option_label;
                      const isSelected = answers[currentQ.question_id] === optKey;

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(currentQ.question_id, optKey)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs ring-1 ring-blue-500 font-semibold"
                              : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {opt.option_label}
                          </span>
                          <span className="text-xs leading-relaxed flex-1">{opt.content}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Nút hành động cho câu hỏi */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleClearAnswer(currentQ.question_id)}
                      className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      ✕ Xóa lựa chọn
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      >
                        ◀ Câu trước
                      </button>

                      <button
                        type="button"
                        disabled={currentIndex === questions.length - 1}
                        onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-30 cursor-pointer"
                      >
                        Câu kế tiếp ▶
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">Không có câu hỏi</div>
              )}
            </div>

            {/* Cột phải: Bảng điều hướng toàn bộ câu hỏi (Palette) */}
            <div className="w-full md:w-68 shrink-0 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Bảng Câu Hỏi
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {Object.keys(answers).length} / {questions.length} đã làm
                </span>
              </div>

              {/* Lưới các nút câu hỏi 1..N */}
              <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isAnswered = !!answers[q.question_id];
                  const isCurrent = idx === currentIndex;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? "ring-2 ring-blue-600 bg-blue-600 text-white shadow-xs"
                          : isAnswered
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black border border-emerald-300"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Chú thích màu */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300 inline-block" />
                  <span>Đã chọn đáp án</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-blue-600 inline-block" />
                  <span>Đang xem</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-white border border-slate-200 inline-block" />
                  <span>Chưa làm</span>
                </div>
              </div>

              {/* Nút nộp bài */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const confirmSubmit = window.confirm("Bạn có chắc chắn muốn nộp bài thi thử để chấm điểm không?");
                    if (confirmSubmit) handleSubmitTest();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
                >
                  🏁 Nộp Bài Chấm Điểm
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* MÀN HÌNH BÁO CÁO KẾT QUẢ SAU KHI NỘP BÀI */
          /* ========================================================================= */
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Hộp điểm số tổng quan */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white text-center relative overflow-hidden shadow-xl">
              <div className="relative z-10 max-w-md mx-auto space-y-3">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${
                    testResult.isPassed ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {testResult.isPassed ? "🎉 Đạt Chuẩn (Passed)" : "⚠️ Chưa Đạt Chuẩn"}
                </span>

                <div className="text-4xl sm:text-5xl font-black tracking-tight">
                  {testResult.earnedScore} <span className="text-lg font-normal text-slate-300">/ {exam.max_score} điểm</span>
                </div>

                <p className="text-xs text-slate-300">
                  Trả lời đúng: <strong>{testResult.correctCount} / {testResult.totalCount}</strong> câu hỏi • Điểm đạt chuẩn: {exam.pass_score} điểm
                </p>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setExamStatus("taking");
                      setAnswers({});
                      setSecondsRemaining((exam.duration_minutes || 45) * 60);
                      setCurrentIndex(0);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                  >
                    🔄 Làm lại bài thi
                  </button>
                </div>
              </div>
            </div>

            {/* Xem chi tiết từng câu làm đúng / sai kèm giải thích */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Chi Tiết Đáp Án Từng Câu Hỏi
              </h3>

              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const selectedKey = answers[q.question_id];
                  const correctOption = q.options.find((o) => o.is_correct);
                  const isCorrect =
                    correctOption &&
                    (selectedKey === correctOption.option_id || selectedKey === correctOption.option_label);

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border ${
                        isCorrect
                          ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
                          : "bg-rose-50/40 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900"
                      } space-y-3`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg font-bold text-xs bg-slate-900 text-white flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              isCorrect
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                            }`}
                          >
                            {isCorrect ? "✓ Chính xác (+ " + q.question_score + " đ)" : "✕ Sai"}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {q.content}
                      </div>

                      {/* Các phương án */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, oIdx) => {
                          const optKey = opt.option_id || opt.option_label;
                          const wasChosen = selectedKey === optKey;

                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${
                                opt.is_correct
                                  ? "bg-emerald-100/70 border-emerald-400 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 font-bold"
                                  : wasChosen
                                    ? "bg-rose-100 border-rose-400 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 font-semibold"
                                    : "border-slate-200 dark:border-slate-800 text-slate-500"
                              }`}
                            >
                              <span className="font-bold w-5">{opt.option_label}.</span>
                              <span className="flex-1">{opt.content}</span>
                              {opt.is_correct && <span className="text-emerald-600 font-bold">✓ Đáp án chuẩn</span>}
                              {wasChosen && !opt.is_correct && <span className="text-rose-600 font-bold">✕ Bạn chọn</span>}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 text-xs text-slate-600 dark:text-slate-400">
                          💡 <strong>Lời giải:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FOOTER */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Học phần: <strong>{exam.title}</strong>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            Đóng Bài Thi Thử
          </button>
        </div>
      </div>
    </div>
  );
}
