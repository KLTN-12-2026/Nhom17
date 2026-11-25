"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export interface WeakTopicItem {
  _id: string;
  name: string;
  subjectName: string;
  latestScore: number;
  attemptsCount: number;
}

export interface ImprovedTopicItem {
  _id: string;
  name: string;
  subjectName: string;
  lowestScore: number;
  latestScore: number;
}

interface KnowledgeGapCardAndModalProps {
  weakTopics: WeakTopicItem[];
  improvedTopics: ImprovedTopicItem[];
  totalSubmitted: number;
}

export default function KnowledgeGapCardAndModal({
  weakTopics,
  improvedTopics,
  totalSubmitted,
}: KnowledgeGapCardAndModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [startingTopicId, setStartingTopicId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string>("");

  const handleStartPractice = async (topicId: string) => {
    try {
      setStartingTopicId(topicId);
      setStartError("");

      const res = await fetch("/api/student/practice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: topicId,
          question_count: 10,
          difficulty: "all",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStartError(data.message || "Không thể khởi tạo bài luyện tập.");
        setStartingTopicId(null);
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(`practice_session_${data.attempt_id}`, JSON.stringify(data));
      }

      router.push(`/student/practice/session/${data.attempt_id}`);
    } catch {
      setStartError("Lỗi kết nối máy chủ. Vui lòng thử lại!");
      setStartingTopicId(null);
    }
  };

  return (
    <>
      {/* Thẻ Thống Kê Số 4: Cảnh Báo Lỗ Hổng AI (Có thể click để xem chi tiết) */}
      <div
        onClick={() => setIsOpen(true)}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-amber-300 dark:hover:border-amber-700/80 transition-all cursor-pointer group relative"
        title="Bấm để xem chi tiết và luyện tập khắc phục các lỗ hổng kiến thức"
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cảnh Báo Lỗ Hổng AI
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold underline underline-offset-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Chi tiết →
            </span>
          </div>
          <span
            className={`p-2 rounded-xl transition-transform group-hover:scale-105 ${
              weakTopics.length > 0
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </span>
        </div>

        <div className="text-3xl font-black text-slate-900 dark:text-white">
          {weakTopics.length} <span className="text-base font-normal text-slate-400">chủ đề</span>
        </div>

        <div className="mt-2 text-xs font-semibold">
          {weakTopics.length > 0 ? (
            <div className="flex items-center justify-between gap-1 text-amber-600 dark:text-amber-400">
              <span className="truncate">
                Cần bổ trợ: <strong>{weakTopics[0].name}</strong>
                {weakTopics.length > 1 && ` (+${weakTopics.length - 1})`}
              </span>
              <span className="text-[11px] font-bold shrink-0 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-300">
                Ôn ngay
              </span>
            </div>
          ) : improvedTopics.length > 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>✓</span>
              <span>Đã bứt phá khắc phục lỗ hổng</span>
            </span>
          ) : totalSubmitted > 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>✓</span>
              <span>Nắm vững kiến thức đã học</span>
            </span>
          ) : (
            <span className="text-slate-400">Chưa có dữ liệu cảnh báo</span>
          )}
        </div>
      </div>

      {/* Modal Popup: Danh Sách Lỗ Hổng Kiến Thức Cần Bổ Trợ */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/60">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Chi Tiết Lỗ Hổng Kiến Thức (AI Chẩn Đoán)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Các chuyên đề bạn làm bài chưa đạt chuẩn (&lt; 6.5 điểm) cần củng cố
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body: Danh sách chuyên đề */}
            <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
              {startError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {startError}
                </div>
              )}

              {weakTopics.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 text-2xl">
                    🎉
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tuyệt vời! Không phát hiện lỗ hổng kiến thức nào
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Tất cả các chuyên đề bạn đã từng làm đều đạt kết quả vững vàng. Hãy tiếp tục duy trì phong độ và thử sức với các dạng bài nâng cao!
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 flex items-center justify-between">
                    <span>
                      Phát hiện <strong>{weakTopics.length} chuyên đề</strong> cần bạn cải thiện:
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Mục tiêu: Đạt ≥ 7.0 điểm
                    </span>
                  </div>

                  {weakTopics.map((item) => {
                    const isStartingThis = startingTopicId === item._id;
                    return (
                      <div
                        key={item._id}
                        className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200/70 dark:border-amber-800/60">
                              {item.subjectName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              • Đã thử {item.attemptsCount} lần
                            </span>
                          </div>
                          <h5 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {item.name}
                          </h5>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="text-slate-500">Lần làm gần nhất:</span>
                            <span className="font-extrabold text-rose-600 dark:text-rose-400">
                              {item.latestScore} / 10 điểm
                            </span>
                            <span className="text-[11px] text-slate-400">(Chưa đạt chuẩn)</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={Boolean(startingTopicId)}
                          onClick={() => handleStartPractice(item._id)}
                          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                        >
                          {isStartingThis ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Đang mở đề...</span>
                            </>
                          ) : (
                            <>
                              <span>Luyện ngay 10 câu</span>
                              <span>→</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                💡 Mẹo: Khi đạt ≥ 7.0đ ở lần làm mới nhất, cảnh báo sẽ tự động biến mất.
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
