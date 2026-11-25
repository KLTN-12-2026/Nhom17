"use client";

import { useState } from "react";
import type { MockAttempt } from "@/lib/mock/practice-result";

export default function PracticeResultDetailView({ attempt }: { attempt: MockAttempt }) {
  const [wrongOnly, setWrongOnly] = useState(false);
  const answers = attempt.answers.filter((answer) => !wrongOnly || !answer.is_correct);
  const accuracy = attempt.total_questions
    ? Math.round((attempt.total_correct / attempt.total_questions) * 100)
    : 0;
  const duration = `${String(Math.floor(attempt.duration_seconds / 60)).padStart(2, "0")}:${String(attempt.duration_seconds % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-6 pb-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Bản demo · dữ liệu mock</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Kết quả và đáp án chi tiết</h1>
        <p className="mt-1 text-sm text-slate-500">{attempt.subject_name} · {attempt.topic_name} · {new Date(attempt.submit_time).toLocaleString("vi-VN")}</p>
      </header>

      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-700 p-6 text-white shadow-lg sm:p-8">
        <p className="text-sm font-bold">{attempt.practice_title}</p>
        <div className="mt-2 text-4xl font-black">{attempt.score.toFixed(1)} / 10</div>
        <p className="mt-2 text-sm text-indigo-100">Thời gian làm bài: {duration}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Tổng câu" value={attempt.total_questions} />
          <Stat label="Câu đúng" value={attempt.total_correct} />
          <Stat label="Câu sai / bỏ trống" value={attempt.total_wrong} />
          <Stat label="Chính xác" value={`${accuracy}%`} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Chi tiết từng câu</h2>
            <p className="text-sm text-slate-500">Đáp án đúng màu xanh, lựa chọn sai của bạn màu đỏ.</p>
          </div>
          <button type="button" aria-pressed={wrongOnly} onClick={() => setWrongOnly((value) => !value)} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${wrongOnly ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700 hover:bg-rose-50"}`}>
            {wrongOnly ? "Đang lọc câu sai · Hiện tất cả" : "Chỉ xem câu sai"}
          </button>
        </div>

        {answers.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center font-semibold text-emerald-800">Bài làm không có câu sai.</div>
        ) : answers.map((answer) => {
          const correctOption = answer.options.find((option) => option.is_correct);
          const selectedOption = answer.options.find((option) => option._id === answer.selected_option_id);
          return (
            <article key={answer.question_id} className={`rounded-2xl border-2 p-5 sm:p-6 ${answer.is_correct ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-rose-200 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20"}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-extrabold text-slate-800 dark:text-white">Câu {answer.index}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${answer.is_correct ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                  {answer.is_correct ? "✓ Trả lời đúng" : "✗ Trả lời sai"}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line font-medium leading-relaxed text-slate-900 dark:text-white">{answer.content}</p>
              <div className="mt-4 space-y-2">
                {answer.options.map((option) => {
                  const selected = option._id === answer.selected_option_id;
                  const style = option.is_correct
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100"
                    : selected
                      ? "border-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-950/50 dark:text-rose-100"
                      : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
                  return <div key={option._id} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${style}`}>
                    <strong>{option.option_label}.</strong><span className="flex-1">{option.content}</span>
                    {option.is_correct && <strong className="text-xs">Đáp án đúng</strong>}
                    {selected && !option.is_correct && <strong className="text-xs">Bạn đã chọn</strong>}
                  </div>;
                })}
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                Bạn chọn: <strong>{selectedOption ? `${selectedOption.option_label}. ${selectedOption.content}` : "Bỏ trống"}</strong>
                {correctOption && <> · Đáp án đúng: <strong className="text-emerald-700">{correctOption.option_label}. {correctOption.content}</strong></>}
              </p>
              <div className="mt-4 rounded-xl border border-indigo-100 bg-white p-4 dark:border-indigo-900 dark:bg-slate-900">
                <h4 className="font-bold text-indigo-700 dark:text-indigo-300">💡 Giải thích</h4>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">{answer.explanation || (correctOption ? `Đáp án đúng là ${correctOption.option_label}.` : "Chưa có lời giải.")}</p>
              </div>
            </article>
          );
        })}
      </section>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Đây là dữ liệu mẫu phục vụ dựng giao diện, chưa phải kết quả bài thi thật.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl bg-white/10 p-4"><div className="text-2xl font-black">{value}</div><div className="text-xs text-indigo-100">{label}</div></div>;
}
