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
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Khu vực biên soạn của: <strong className="text-slate-800 dark:text-slate-200 font-medium">{currentUser.name}</strong></span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {currentUser.role === "admin" ? "Toàn quyền quản trị" : "Giáo viên bộ môn"}
          </span>
        </div>
      )}

      {/* 4 Metrics Ribbon */}
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Tổng số đề thi</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.total}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Tất cả bộ đề trong hệ thống</div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Đã xuất bản</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.published}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Sẵn sàng tổ chức thi</div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Bản nháp</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.draft}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Đang hoàn thiện nội dung</div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Câu hỏi đã gắn đề</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.totalQuestionsInAll}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Có snapshot bảo lưu độc lập</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Action Button */}
      <div className="border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tiêu đề đề thi..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
          >
            <option value="all">Tất cả môn học ({subjects.length})</option>
            {subjects.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.subject_name} {sub.code ? `(${sub.code})` : ""}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value as "all" | "published" | "draft")}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="published">Đã xuất bản ({stats.published})</option>
            <option value="draft">Bản nháp ({stats.draft})</option>
          </select>
        </div>

        {/* Create Exam Button */}
        <button
          type="button"
          onClick={() => {
            setExamToEdit(null);
            setIsCreatorModalOpen(true);
          }}
          className="w-full md:w-auto px-3.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Tạo Đề Thi Mới</span>
        </button>
      </div>

      {/* Exams Grid */}
      {isLoading ? (
        <div className="py-20 text-center border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
          <span>Đang tải danh sách đề thi...</span>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-8 space-y-3">
          <svg className="w-8 h-8 text-slate-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Chưa có đề thi nào phù hợp
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Bạn có thể bấm &quot;Tạo Đề Thi Mới&quot; để chọn môn học, bốc câu hỏi tự động hoặc chọn thủ công từ ngân hàng.
          </p>
          <button
            type="button"
            onClick={() => {
              setExamToEdit(null);
              setIsCreatorModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-medium hover:opacity-90 transition cursor-pointer"
          >
            <span>+</span> Tạo đề thi ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => {
            const subjectName = exam.subject_id?.subject_name || "Môn chung";
            const qCount = exam.questions?.length || 0;

            return (
              <div
                key={exam._id}
                className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate">
                      {subjectName}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleTogglePublish(exam._id, exam.is_published)}
                      title={exam.is_published ? "Bấm để chuyển về Bản nháp" : "Bấm để Xuất bản đề thi"}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border transition cursor-pointer flex items-center gap-1.5 ${
                        exam.is_published
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80"
                          : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${exam.is_published ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      <span>{exam.is_published ? "Đã xuất bản" : "Bản nháp"}</span>
                    </button>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setDetailsModalExam(exam as unknown as ExamDataToEdit)}
                    className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition cursor-pointer leading-snug line-clamp-2 mb-3"
                  >
                    {exam.title}
                  </h3>

                  {/* 3 Metrics: Duration, Question count, Max score */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs mb-3 text-center border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Thời lượng</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">{exam.duration_minutes}p</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Số câu</span>
                      <strong className="text-slate-900 dark:text-white font-semibold">{qCount} câu</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Thang điểm</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">{exam.max_score}đ</strong>
                    </div>
                  </div>

                  {/* Feature badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mb-4">
                    {exam.shuffle_questions && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                        Xáo câu
                      </span>
                    )}
                    {exam.shuffle_options && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                        Đảo đáp án
                      </span>
                    )}
                    {exam.allow_view_result_immediately && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                        Xem đáp án ngay
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDetailsModalExam(exam as unknown as ExamDataToEdit)}
                      title="Xem chi tiết đề thi và lời giải"
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Chi tiết</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPracticeModalExam(exam as unknown as ExamDataToEdit)}
                      title="Trải nghiệm làm bài thi thử như học viên"
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/80 dark:border-emerald-800/80 transition cursor-pointer flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Thi thử</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setExamToEdit(exam as unknown as ExamDataToEdit);
                        setIsCreatorModalOpen(true);
                      }}
                      title="Chỉnh sửa cấu hình và câu hỏi đề thi"
                      className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      disabled={isDeletingId === exam._id}
                      onClick={() => handleDeleteExam(exam._id)}
                      title="Xóa đề thi"
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition cursor-pointer disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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
