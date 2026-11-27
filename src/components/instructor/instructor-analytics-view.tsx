"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import ExamAiAnalyticsModal from "@/components/exams/exam-ai-analytics-modal";

export interface IExamSubmissionRow {
  attempt_id: string;
  student_name: string;
  student_email: string;
  score: number;
  total_correct: number;
  total_wrong: number;
  duration_seconds: number;
  submit_time: string;
}

export interface IExamAnalyticsOverview {
  exam_id: string;
  title: string;
  subject_name: string;
  total_questions: number;
  max_score: number;
  pass_score: number;
  is_published: boolean;
  total_submissions: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number;
  submissions: IExamSubmissionRow[];
}

export default function InstructorAnalyticsView({
  exams,
}: {
  exams: IExamAnalyticsOverview[];
}) {
  // Ưu tiên chọn sẵn đề thi đầu tiên có thí sinh nộp bài
  const defaultExam =
    exams.find((e) => e.total_submissions > 0) || exams[0] || null;
  const [selectedExamId, setSelectedExamId] = useState<string>(
    defaultExam?.exam_id || ""
  );
  const [openAiModal, setOpenAiModal] = useState<boolean>(false);

  const selectedExam = useMemo(
    () => exams.find((e) => e.exam_id === selectedExamId) || null,
    [exams, selectedExamId]
  );

  // Phân bố phổ điểm chuẩn hóa về thang 10
  const distribution = useMemo(() => {
    const bands = [
      { label: "< 4.0 (Yếu)", count: 0, color: "bg-rose-500" },
      { label: "4.0 - 4.9 (Chưa đạt)", count: 0, color: "bg-amber-500" },
      { label: "5.0 - 6.4 (Trung bình)", count: 0, color: "bg-sky-500" },
      { label: "6.5 - 7.9 (Khá)", count: 0, color: "bg-indigo-500" },
      { label: "8.0 - 10 (Giỏi)", count: 0, color: "bg-emerald-500" },
    ];

    if (!selectedExam || selectedExam.total_submissions === 0) return bands;

    for (const sub of selectedExam.submissions) {
      const maxSc = selectedExam.max_score || 10;
      const norm10 = maxSc > 0 ? (sub.score / maxSc) * 10 : sub.score;
      if (norm10 < 4) bands[0].count += 1;
      else if (norm10 < 5) bands[1].count += 1;
      else if (norm10 < 6.5) bands[2].count += 1;
      else if (norm10 < 8) bands[3].count += 1;
      else bands[4].count += 1;
    }

    return bands;
  }, [selectedExam]);

  const handleExportExcel = () => {
    if (!selectedExam || selectedExam.submissions.length === 0) return;

    const rows = selectedExam.submissions.map((s, idx) => ({
      STT: idx + 1,
      "Họ và tên": s.student_name,
      Email: s.student_email,
      "Điểm số": s.score,
      "Thang điểm": selectedExam.max_score,
      "Số câu đúng": s.total_correct,
      "Số câu sai": s.total_wrong,
      "Thời gian (giây)": s.duration_seconds,
      "Thời điểm nộp": new Date(s.submit_time).toLocaleString("vi-VN"),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BangDiem");
    const safeTitle = selectedExam.title
      .replace(/[^a-zA-Z0-9\u00C0-\u1EF9\s_-]/g, "")
      .trim()
      .slice(0, 40);
    XLSX.writeFile(wb, `PhoDiem_${safeTitle || "DeThi"}.xlsx`);
  };

  if (exams.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-2xl">
          📊
        </div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          Chưa có đề thi nào để thống kê
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Hãy tạo và phát hành đề thi, sau đó mở phòng thi trực tuyến để AI tổng hợp phổ điểm và lỗ hổng kiến thức của lớp.
        </p>
        <div className="pt-2">
          <Link
            href="/instructor/exams"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 text-xs font-bold shadow-xs transition hover:opacity-90"
          >
            + Tạo đề thi ngay
          </Link>
        </div>
      </div>
    );
  }

  const maxBandCount = Math.max(1, ...distribution.map((b) => b.count));

  return (
    <div className="space-y-6 pb-10">
      {/* 1. Thanh chọn đề thi & Hành động */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <label
            htmlFor="exam-analytics-select"
            className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block"
          >
            Chọn đề thi cần xem phổ điểm &amp; báo cáo AI
          </label>
          <select
            id="exam-analytics-select"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full max-w-2xl rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {exams.map((exam) => (
              <option key={exam.exam_id} value={exam.exam_id}>
                {exam.title} — {exam.subject_name} ({exam.total_submissions} bài nộp)
              </option>
            ))}
          </select>
        </div>

        {selectedExam && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={selectedExam.total_submissions === 0}
              className="px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 disabled:opacity-40 text-xs font-bold transition cursor-pointer"
            >
              📥 Xuất Excel bảng điểm
            </button>
            <button
              type="button"
              onClick={() => setOpenAiModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              🤖 Phân Tích AI Lớp Học &amp; Câu Sai Nhiều
            </button>
          </div>
        )}
      </div>

      {selectedExam && (
        <>
          {/* Cảnh báo điều kiện ràng buộc PB15 khi số mẫu ít */}
          {selectedExam.total_submissions > 0 &&
            selectedExam.total_submissions < 3 && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                <span className="text-base shrink-0">⚠️</span>
                <span>
                  <strong>Lưu ý độ tin cậy dữ liệu (PB15):</strong> Đề thi hiện mới có{" "}
                  <strong>{selectedExam.total_submissions}</strong> lượt nộp bài chính thức. Khi có từ{" "}
                  <strong>3 thí sinh</strong> trở lên hoàn thành bài thi, phân tích phổ điểm và đề xuất củng cố của AI sẽ khách quan hơn.
                </span>
              </div>
            )}

          {/* 2. 4 Thẻ thống kê KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tổng bài nộp
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {selectedExam.total_submissions}{" "}
                <span className="text-xs font-normal text-slate-400">bài</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Đề gồm {selectedExam.total_questions} câu
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Điểm trung bình
              </span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {selectedExam.average_score}{" "}
                <span className="text-xs font-normal text-slate-400">
                  / {selectedExam.max_score}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ngưỡng đạt: {selectedExam.pass_score} điểm
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Biên độ điểm
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                {selectedExam.lowest_score}đ ➔ {selectedExam.highest_score}đ
              </div>
              <p className="text-xs text-slate-500 mt-1">Thấp nhất – Cao nhất</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tỷ lệ đạt chuẩn
              </span>
              <div
                className={`text-2xl sm:text-3xl font-black mt-1 ${
                  selectedExam.pass_rate >= 70
                    ? "text-emerald-600 dark:text-emerald-400"
                    : selectedExam.pass_rate >= 50
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {selectedExam.pass_rate}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Đạt từ {selectedExam.pass_score} điểm trở lên
              </p>
            </div>
          </div>

          {/* 3. Biểu đồ phổ điểm & Bảng kết quả */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Biểu đồ phân bố điểm */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Phân Bố Phổ Điểm (Quy đổi thang 10)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Số lượng thí sinh theo từng ngưỡng năng lực
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {distribution.map((band) => {
                  const pct =
                    selectedExam.total_submissions > 0
                      ? Math.round(
                          (band.count / selectedExam.total_submissions) * 100
                        )
                      : 0;
                  const barWidth = Math.round((band.count / maxBandCount) * 100);
                  return (
                    <div key={band.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">
                          {band.label}
                        </span>
                        <span className="text-slate-500">
                          {band.count} em ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${band.color} transition-all duration-500`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bảng chi tiết thí sinh */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Bảng Điểm Thí Sinh ({selectedExam.total_submissions})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tổng hợp từ các phòng thi trực tuyến (đã loại bỏ lượt tự luyện)
                  </p>
                </div>
              </div>

              {selectedExam.submissions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Chưa có học sinh nào nộp bài cho đề thi này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-2.5 pr-3">Thí sinh</th>
                        <th className="pb-2.5 pr-3">Đúng / Sai</th>
                        <th className="pb-2.5 pr-3">Điểm</th>
                        <th className="pb-2.5 text-right">Nộp lúc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {selectedExam.submissions.map((sub) => (
                        <tr
                          key={sub.attempt_id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 pr-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {sub.student_name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {sub.student_email}
                            </div>
                          </td>
                          <td className="py-3 pr-3 font-medium">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {sub.total_correct} đúng
                            </span>{" "}
                            /{" "}
                            <span className="text-rose-600 dark:text-rose-400">
                              {sub.total_wrong} sai
                            </span>
                          </td>
                          <td className="py-3 pr-3 font-black text-indigo-600 dark:text-indigo-400">
                            {sub.score} / {selectedExam.max_score}
                          </td>
                          <td className="py-3 text-right text-slate-500 text-[11px]">
                            {new Date(sub.submit_time).toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Báo cáo AI Chẩn đoán lớp học */}
      <ExamAiAnalyticsModal
        isOpen={openAiModal}
        onClose={() => setOpenAiModal(false)}
        examId={selectedExam?.exam_id || null}
        examTitle={selectedExam?.title}
      />
    </div>
  );
}
