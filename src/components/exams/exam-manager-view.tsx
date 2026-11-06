"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ExamCreatorModal, {
  SubjectItem,
  TopicItem,
  ExamDataToEdit,
} from "./exam-creator-modal";
import ExamDetailsModal from "./exam-details-modal";
import ExamPracticeModal from "./exam-practice-modal";

export interface CurrentUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "admin" | "instructor" | "student";
}

interface ExamManagerViewProps {
  currentUser?: CurrentUser | null;
}

interface ExamListItem {
  _id: string;
  title: string;
  subject_id?: {
    _id: string;
    subject_name: string;
    code?: string;
  };
  duration_minutes: number;
  total_questions: number;
  pass_score: number;
  max_score: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  allow_view_result_immediately: boolean;
  is_published: boolean;
  questions: Array<{
    question_id: string;
    question_order: number;
    question_score: number;
    question_snapshot?: {
      content: string;
      difficulty_level: "easy" | "medium" | "hard";
      explanation?: string;
      options: Array<{
        option_label: string;
        content: string;
        is_correct: boolean;
      }>;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function ExamManagerView({ currentUser }: ExamManagerViewProps) {
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "published" | "draft">("all");

  // State các Modal
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<ExamDataToEdit | null>(null);

  const [detailsModalExam, setDetailsModalExam] = useState<ExamDataToEdit | null>(null);
  const [practiceModalExam, setPracticeModalExam] = useState<ExamDataToEdit | null>(null);

  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Tải lại danh sách đề thi sau khi tạo hoặc sửa
  const reloadData = useCallback(async () => {
    try {
      const res = await fetch("/api/instructor/exams");
      const data = await res.json();
      if (data.success && Array.isArray(data.exams)) {
        setExams(data.exams);
      }
    } catch (err) {
      console.error("Lỗi khi tải lại dữ liệu đề thi:", err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetch("/api/instructor/exams").then((res) => res.json()),
      fetch("/api/instructor/subjects").then((res) => res.json()),
    ])
      .then(([examsData, subjectsData]) => {
        if (!ignore) {
          if (examsData.success && Array.isArray(examsData.exams)) {
            setExams(examsData.exams);
          }
          if (subjectsData.success) {
            if (Array.isArray(subjectsData.subjects)) setSubjects(subjectsData.subjects);
            if (Array.isArray(subjectsData.topics)) setTopics(subjectsData.topics);
          }
        }
      })
      .catch((err) => {
        console.error("Lỗi khi tải dữ liệu đề thi:", err);
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Bật/tắt xuất bản nhanh 1-click
  async function handleTogglePublish(examId: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/instructor/exams/${examId}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setExams((prev) =>
          prev.map((e) => (e._id === examId ? { ...e, is_published: !currentStatus } : e)),
        );
      } else {
        alert(data.message || "Không thể chuyển trạng thái xuất bản");
      }
    } catch {
      alert("Lỗi kết nối khi cập nhật trạng thái đề thi");
    }
  }

  // Xóa đề thi
  async function handleDeleteExam(examId: string) {
    const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa đề thi này không? Thao tác này không thể hoàn tác.");
    if (!confirmDelete) return;

    setIsDeletingId(examId);
    try {
      const res = await fetch(`/api/instructor/exams/${examId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setExams((prev) => prev.filter((e) => e._id !== examId));
      } else {
        alert(data.message || "Không thể xóa đề thi");
      }
    } catch {
      alert("Lỗi kết nối khi xóa đề thi");
    } finally {
      setIsDeletingId(null);
    }
  }

  // Danh sách đề thi sau khi lọc
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (selectedSubjectFilter !== "all" && e.subject_id?._id !== selectedSubjectFilter) {
        return false;
      }
      if (selectedStatusFilter === "published" && !e.is_published) {
        return false;
      }
      if (selectedStatusFilter === "draft" && e.is_published) {
        return false;
      }
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(term);
        const matchSubject = e.subject_id?.subject_name.toLowerCase().includes(term);
        if (!matchTitle && !matchSubject) return false;
      }
      return true;
    });
  }, [exams, selectedSubjectFilter, selectedStatusFilter, searchQuery]);

  // Thống kê số lượng
  const stats = useMemo(() => {
    const total = exams.length;
    const published = exams.filter((e) => e.is_published).length;
    const draft = total - published;
    const totalQuestionsInAll = exams.reduce((acc, e) => acc + (e.questions?.length || 0), 0);
    return { total, published, draft, totalQuestionsInAll };
  }, [exams]);

  return (
    <div className="space-y-6">
      {currentUser?.name && (
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 px-4 py-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Khu vực giảng dạy của: <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong></span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
            {currentUser.role === "admin" ? "Toàn Quyền Admin" : "Giáo Viên Bộ Môn"}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4 THẺ THỐNG KÊ TỔNG QUAN */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tổng Số Đề Thi
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
            Tất cả bộ đề trong hệ thống
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Đã Xuất Bản
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.published}
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold">
            Sẵn sàng tổ chức kiểm tra
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bản Nháp
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
            {stats.draft}
          </div>
          <div className="mt-2 text-xs text-amber-600 font-semibold">
            Đang hoàn thiện nội dung
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Câu Hỏi Đã Gắn Đề
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
            {stats.totalQuestionsInAll}
          </div>
          <div className="mt-2 text-xs text-purple-600 font-semibold">
            Có snapshot bảo lưu độc lập
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THANH CÔNG CỤ: TÌM KIẾM, LỌC MÔN HỌC & NÚT TẠO ĐỀ */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Bộ lọc bên trái */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Ô tìm kiếm */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tiêu đề đề thi..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Lọc theo Ngân hàng môn học */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-medium"
          >
            <option value="all">Tất cả ngân hàng môn ({subjects.length})</option>
            {subjects.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.subject_name} {sub.code ? `(${sub.code})` : ""}
              </option>
            ))}
          </select>

          {/* Lọc trạng thái xuất bản */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value as "all" | "published" | "draft")}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-medium"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="published">🟢 Đã xuất bản ({stats.published})</option>
            <option value="draft">🟡 Bản nháp ({stats.draft})</option>
          </select>
        </div>

        {/* Nút Tạo đề thi mới bên phải */}
        <button
          type="button"
          onClick={() => {
            setExamToEdit(null);
            setIsCreatorModalOpen(true);
          }}
          className="w-full md:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Tạo Đề Thi Mới</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* DANH SÁCH ĐỀ THI (LƯỚI DẠNG CARDS) */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          Đang tải danh sách đề thi...
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 space-y-3">
          <span className="text-4xl block">📋</span>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Chưa có đề thi nào phù hợp
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Bạn có thể bấm nút &quot;Tạo Đề Thi Mới&quot; để chọn ngân hàng môn học, bốc câu hỏi ngẫu nhiên hoặc chọn thủ công.
          </p>
          <button
            type="button"
            onClick={() => {
              setExamToEdit(null);
              setIsCreatorModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
          >
            <span>+ Tạo đề thi ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam) => {
            const subjectName = exam.subject_id?.subject_name || "Môn chung";
            const qCount = exam.questions?.length || 0;

            return (
              <div
                key={exam._id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top: Ngân hàng môn học & Huy hiệu trạng thái */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900 flex items-center gap-1.5 truncate">
                      <span>📚</span>
                      <span className="truncate">{subjectName}</span>
                    </span>

                    {/* Công tắc Bật/Tắt Xuất bản 1-click */}
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(exam._id, exam.is_published)}
                      title={exam.is_published ? "Bấm để chuyển về Bản nháp" : "Bấm để Xuất bản đề thi"}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition cursor-pointer flex items-center gap-1 ${
                        exam.is_published
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      <span>{exam.is_published ? "Đã xuất bản" : "Bản nháp"}</span>
                    </button>
                  </div>

                  {/* Tiêu đề đề thi */}
                  <h3
                    onClick={() => setDetailsModalExam(exam as unknown as ExamDataToEdit)}
                    className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition cursor-pointer leading-snug line-clamp-2 mb-3"
                  >
                    {exam.title}
                  </h3>

                  {/* 3 thông số chính: Thời gian, Số câu, Điểm */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs mb-3 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Thời lượng</span>
                      <strong className="text-slate-800 dark:text-slate-200">{exam.duration_minutes}p</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Số câu</span>
                      <strong className="text-blue-600 dark:text-blue-400">{qCount} câu</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Thang điểm</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">{exam.max_score} đ</strong>
                    </div>
                  </div>

                  {/* Huy hiệu tính năng thông minh */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mb-4">
                    {exam.shuffle_questions && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                        🔀 Xáo câu
                      </span>
                    )}
                    {exam.shuffle_options && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                        🔀 Đảo đáp án
                      </span>
                    )}
                    {exam.allow_view_result_immediately && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                        👁️ Xem đáp án
                      </span>
                    )}
                  </div>
                </div>

                {/* HÀNG HÀNH ĐỘNG DƯỚI CÙNG */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {/* Nút Xem chi tiết */}
                    <button
                      type="button"
                      onClick={() => setDetailsModalExam(exam as unknown as ExamDataToEdit)}
                      title="Xem chi tiết đề thi và lời giải"
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
                    >
                      <span>👁️ Chi tiết</span>
                    </button>

                    {/* Nút Thi thử */}
                    <button
                      type="button"
                      onClick={() => setPracticeModalExam(exam as unknown as ExamDataToEdit)}
                      title="Trải nghiệm làm bài thi thử như học viên"
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer flex items-center gap-1"
                    >
                      <span>✍️ Thi thử</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Nút Sửa đề */}
                    <button
                      type="button"
                      onClick={() => {
                        setExamToEdit(exam as unknown as ExamDataToEdit);
                        setIsCreatorModalOpen(true);
                      }}
                      title="Chỉnh sửa cấu hình và câu hỏi đề thi"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                    >
                      ✏️
                    </button>

                    {/* Nút Xóa đề */}
                    <button
                      type="button"
                      disabled={isDeletingId === exam._id}
                      onClick={() => handleDeleteExam(exam._id)}
                      title="Xóa đề thi"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3 MODALS: TẠO/SỬA ĐỀ - XEM CHI TIẾT - THI THỬ */}
      {/* ========================================================================= */}

      {/* 1. Modal Tạo / Sửa Đề Thi */}
      {isCreatorModalOpen && (
        <ExamCreatorModal
          isOpen={isCreatorModalOpen}
          onClose={() => {
            setIsCreatorModalOpen(false);
            setExamToEdit(null);
          }}
          onSuccess={() => {
            reloadData();
          }}
          subjects={subjects}
          topics={topics}
          initialExam={examToEdit}
        />
      )}

      {/* 2. Modal Xem Chi Tiết Đề Thi */}
      {detailsModalExam && (
        <ExamDetailsModal
          isOpen={!!detailsModalExam}
          onClose={() => setDetailsModalExam(null)}
          exam={detailsModalExam}
          onEditExam={(e) => {
            setExamToEdit(e);
            setIsCreatorModalOpen(true);
          }}
          onStartPractice={(e) => {
            setPracticeModalExam(e);
          }}
        />
      )}

      {/* 3. Modal Thi Thử Như Học Viên */}
      {practiceModalExam && (
        <ExamPracticeModal
          isOpen={!!practiceModalExam}
          onClose={() => setPracticeModalExam(null)}
          exam={practiceModalExam}
        />
      )}
    </div>
  );
}
