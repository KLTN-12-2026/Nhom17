"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IStudentAiDiagnosisResult } from "@/lib/ai-analysis-service";

interface AiAttemptAnalysisCardProps {
  attemptId: string;
  autoAnalyze?: boolean;
  onTopicSelectedForPractice?: (topicId: string) => void;
}

export default function AiAttemptAnalysisCard({
  attemptId,
  autoAnalyze = false,
  onTopicSelectedForPractice,
}: AiAttemptAnalysisCardProps) {
  const router = useRouter();

  const [analysis, setAnalysis] = useState<IStudentAiDiagnosisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isCached, setIsCached] = useState<boolean>(false);

  // Tự động tải nếu đã có cache hoặc nếu autoAnalyze = true
  useEffect(() => {
    let isCancelled = false;

    async function checkExistingAnalysis() {
      if (!attemptId) return;
      try {
        const res = await fetch(`/api/student/practice/ai-analysis?attempt_id=${attemptId}`);
        const data = await res.json();
        if (!isCancelled && data.success && data.analysis) {
          setAnalysis(data.analysis);
          setIsCached(data.has_ai_analysis);
        } else if (autoAnalyze && !isCancelled) {
          triggerAiAnalysis(false);
        }
      } catch {
        // Lỗi kiểm tra cache ban đầu thì bỏ qua
      }
    }

    checkExistingAnalysis();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, autoAnalyze]);

  async function triggerAiAnalysis(forceRefresh: boolean = false) {
    if (!attemptId) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/student/practice/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: attemptId,
          force_refresh: forceRefresh,
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        setIsCached(data.cached || false);
      } else {
        setError(data.message || "Không thể phân tích kết quả bằng AI.");
      }
    } catch {
      setError("Lỗi kết nối máy chủ khi gọi phân tích AI.");
    } finally {
      setLoading(false);
    }
  }

  function handlePracticeTopic(topicId: string) {
    if (onTopicSelectedForPractice) {
      onTopicSelectedForPractice(topicId);
    } else {
      router.push(`/student/practice?topicId=${topicId}`);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/60 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden transition-all">
      {/* Header card trợ lý AI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Trợ Lý AI Phân Tích Lỗ Hổng Kiến Thức
              </h3>
              {isCached && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Đã lưu
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Định vị điểm mạnh, kiến thức hổng và gợi ý chuyên đề ôn tập tiếp theo
            </p>
          </div>
        </div>

        {analysis && (
          <button
            type="button"
            onClick={() => triggerAiAnalysis(true)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>{loading ? "Đang phân tích..." : "Phân tích lại"}</span>
          </button>
        )}
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Trạng thái 1: Chưa phân tích và chưa loading */}
      {!analysis && !loading && (
        <div className="py-6 sm:py-8 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-2xl">
            ✨
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Bạn muốn biết mình đang mạnh và yếu ở chuyên đề nào?
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              AI sẽ quét toàn bộ câu trả lời, so khớp với cây kiến thức chương trình THPT và đề xuất lộ trình khắc phục nhanh nhất.
            </p>
          </div>
          <button
            type="button"
            onClick={() => triggerAiAnalysis(false)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 active:scale-95 transition cursor-pointer inline-flex items-center gap-2"
          >
            <span>🚀</span>
            <span>Kích Hoạt AI Phân Tích Ngay</span>
          </button>
        </div>
      )}

      {/* Trạng thái 2: Đang tải phân tích */}
      {loading && (
        <div className="py-8 sm:py-10 text-center space-y-3 animate-pulse">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-xl animate-spin">
            ⚙️
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              Trợ lý AI đang quét câu sai và bóc tách ma trận kiến thức...
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Thời gian xử lý thông thường từ 1 - 3 giây
            </p>
          </div>
        </div>
      )}

      {/* Trạng thái 3: Đã có kết quả phân tích đầy đủ */}
      {analysis && !loading && (
        <div className="mt-5 space-y-5 animate-fade-in">
          {/* Tóm tắt tổng quan */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            💡 <strong>Nhận định:</strong> {analysis.summary}
          </div>

          {/* Grid 2 cột: Điểm Mạnh & Lỗ Hổng Kiến Thức */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cột Điểm Mạnh */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                <span>🌟</span>
                <span>Điểm Mạnh Đã Làm Tốt</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {analysis.strengths}
              </p>
            </div>

            {/* Cột Điểm Yếu */}
            <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
                <span>🎯</span>
                <span>Lỗ Hổng Kiến Thức Cần Bù Đắp</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {analysis.weak_points}
              </p>
            </div>
          </div>

          {/* Lời khuyên sư phạm của AI */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200/70 dark:border-purple-800/60 space-y-2">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-xs uppercase tracking-wider">
              <span>💬</span>
              <span>Lời Khuyên Học Tập Tự Động Từ AI</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
              &ldquo;{analysis.ai_feedback}&rdquo;
            </p>
          </div>

          {/* Ma trận phân bổ theo từng chuyên đề */}
          {analysis.topic_breakdown && analysis.topic_breakdown.length > 0 && (
            <div className="space-y-2.5">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                📊 Kết Quả Từng Mảng Kiến Thức
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {analysis.topic_breakdown.map((t) => (
                  <div
                    key={t.topic_id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                        {t.topic_name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          t.status === "good"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : t.status === "needs_review"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {t.status === "good" ? "✓ Vững vàng" : t.status === "needs_review" ? "Cần rà soát" : "⚠️ Hổng kiến thức"}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          t.status === "good"
                            ? "bg-emerald-500"
                            : t.status === "needs_review"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${t.accuracy_percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Đúng {t.correct}/{t.total} câu</span>
                      <span className="font-bold">{t.accuracy_percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Đề xuất các chuyên đề ôn luyện phù hợp tiếp theo */}
          {analysis.recommended_topics && analysis.recommended_topics.length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Đề Xuất Chuyên Đề Ôn Luyện Phù Hợp Tiếp Theo</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {analysis.recommended_topics.length} chuyên đề ưu tiên
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {analysis.recommended_topics.map((t) => (
                  <div
                    key={t.topic_id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800/80 shadow-2xs flex flex-col justify-between gap-2"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2">
                      📖 {t.topic_name}
                    </span>

                    <button
                      type="button"
                      onClick={() => handlePracticeTopic(t.topic_id)}
                      className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                    >
                      <span>Luyện tập ngay</span>
                      <span>➔</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checklist hành động cụ thể */}
          {analysis.action_items && analysis.action_items.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                📝 Kế Hoạch Khắc Phục Tiếp Theo
              </span>
              <ul className="space-y-1.5">
                {analysis.action_items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
                  >
                    <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nút kết nối trực tiếp với Student AI Agent */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const promptText =
                  "Hãy phân tích sâu các câu tôi đã làm sai trong bài này và hướng dẫn cách khắc phục từng dạng bài.";
                if (typeof document !== "undefined" && document.querySelector('[data-floating-ai="true"]')) {
                  window.dispatchEvent(
                    new CustomEvent("open-ai-agent-chat", {
                      detail: {
                        prompt: promptText,
                        contextType: "attempt",
                        contextId: attemptId,
                      },
                    })
                  );
                } else {
                  router.push(
                    `/student/ai-analysis?attemptId=${attemptId}&q=${encodeURIComponent(promptText)}`
                  );
                }
              }}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <span>💬 Trao đổi sâu hơn với Trợ lý AI về bài làm này</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
