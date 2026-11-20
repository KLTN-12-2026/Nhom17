"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  extractTextFromDocx,
  parseQuestionsFromExcel,
  parseQuestionsFromText,
  type ParsedQuestion,
} from "@/lib/question-parser";

type ContentType = "exam" | "practice" | "lesson";

interface RoadmapContent {
  _id?: string;
  content_type: ContentType;
  title: string;
  order: number;
  exam_id?: string;
  topic_id?: string;
  resource_url?: string;
  file_name?: string;
}

interface RoadmapItem {
  _id: string;
  title: string;
  subject_id: string;
  subject_name: string;
  description: string;
  price: number;
  cover_image: string;
  is_published: boolean;
  contents: RoadmapContent[];
  learner_count: number;
  content_count: number;
  updatedAt?: string;
}

interface ExamOption {
  _id: string;
  title: string;
  is_published: boolean;
  subject_id?: { _id?: string; subject_name?: string } | string;
  subject_ids?: Array<string | { _id?: string }>;
}

interface TopicOption {
  _id: string;
  topic_name: string;
  subject_id?: string | { _id?: string; subject_name?: string };
  level?: number;
}

interface SubjectOption {
  _id: string;
  subject_name: string;
}

interface RoadmapDraft {
  title: string;
  subject_id: string;
  description: string;
  price: number;
  cover_image: string;
  contents: RoadmapContent[];
}

interface RoadmapContentsEditorProps {
  contents: RoadmapContent[];
  exams: ExamOption[];
  topics: TopicOption[];
  subjectId: string;
  onChange: (contents: RoadmapContent[]) => void;
}

function getSubjectName(subject: ExamOption["subject_id"] | TopicOption["subject_id"]) {
  if (!subject || typeof subject === "string") return "";
  return subject.subject_name || "";
}

function getReferenceId(
  subject: string | { _id?: string; subject_name?: string } | undefined,
) {
  if (!subject) return "";
  return typeof subject === "string" ? subject : subject._id || "";
}

function examMatchesSubject(exam: ExamOption, subjectId: string) {
  return [
    getReferenceId(exam.subject_id),
    ...(exam.subject_ids || []).map((subject) => getReferenceId(subject)),
  ].includes(subjectId);
}

async function uploadRoadmapFile(file: File, kind: "cover" | "material") {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("kind", kind);
  const response = await fetch("/api/instructor/roadmaps/upload", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Không thể tải tệp lên.");
  }
  return data as { url: string; file_name: string };
}

async function parseAssessmentFile(file: File): Promise<ParsedQuestion[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (["xlsx", "xls", "csv"].includes(extension || "")) {
    return parseQuestionsFromExcel(await file.arrayBuffer());
  }
  if (extension === "docx") {
    return parseQuestionsFromText(
      await extractTextFromDocx(await file.arrayBuffer()),
    );
  }
  if (extension === "txt" || extension === "md") {
    return parseQuestionsFromText(await file.text());
  }
  throw new Error("File câu hỏi chỉ hỗ trợ XLSX, XLS, CSV, DOCX, TXT hoặc MD.");
}

function isImportableQuestion(question: ParsedQuestion) {
  return (
    question.isValid &&
    question.options.length === 4 &&
    question.options.every((option) => option.content.trim()) &&
    question.options.filter((option) => option.is_correct).length === 1
  );
}

function RoadmapContentsEditor({
  contents,
  exams,
  topics,
  subjectId,
  onChange,
}: RoadmapContentsEditorProps) {
  const [contentType, setContentType] = useState<ContentType>("practice");
  const [contentSource, setContentSource] = useState<"file" | "existing">("file");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedLessonTopic, setSelectedLessonTopic] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentDuration, setAssessmentDuration] = useState(45);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [assessmentInputKey, setAssessmentInputKey] = useState(0);
  const [materialInputKey, setMaterialInputKey] = useState(0);
  const [itemError, setItemError] = useState("");

  function appendContent(content: RoadmapContent) {
    onChange([...contents, { ...content, order: contents.length + 1 }]);
    setSelectedExam("");
    setSelectedTopic("");
    setSelectedLessonTopic("");
    setLessonTitle("");
    setMaterialFile(null);
    setAssessmentFile(null);
    setAssessmentTitle("");
    setParsedQuestions([]);
    setAssessmentInputKey((key) => key + 1);
    setMaterialInputKey((key) => key + 1);
  }

  async function addContent() {
    setItemError("");
    if (contentType === "lesson") {
      const lessonTopic = topics.find(
        (item) => item._id === selectedLessonTopic,
      );
      if (!lessonTopic && !materialFile) {
        setItemError("Chọn bài học có sẵn hoặc tải lên tệp tài liệu.");
        return;
      }

      setIsAddingContent(true);
      try {
        const uploaded = materialFile
          ? await uploadRoadmapFile(materialFile, "material")
          : null;
        const title =
          lessonTitle.trim() ||
          lessonTopic?.topic_name ||
          materialFile?.name.replace(/\.[^.]+$/, "") ||
          "Tài liệu học tập";
        appendContent({
          content_type: "lesson",
          title,
          topic_id: lessonTopic?._id,
          resource_url: uploaded?.url,
          file_name: uploaded?.file_name,
          order: contents.length + 1,
        });
      } catch (cause) {
        setItemError(
          cause instanceof Error ? cause.message : "Không thể tải tài liệu lên.",
        );
      } finally {
        setIsAddingContent(false);
      }
      return;
    }

    if (contentSource === "existing") {
      let content: RoadmapContent;
      if (contentType === "exam") {
        const exam = exams.find((item) => item._id === selectedExam);
        if (!exam) {
          setItemError("Vui lòng chọn một đề thi.");
          return;
        }
        content = {
          content_type: "exam",
          title: exam.title,
          exam_id: exam._id,
          order: contents.length + 1,
        };
      } else {
        const topic = topics.find((item) => item._id === selectedTopic);
        if (!topic) {
          setItemError("Vui lòng chọn chuyên đề tự luyện.");
          return;
        }
        content = {
          content_type: "practice",
          title: `Tự luyện: ${topic.topic_name}`,
          topic_id: topic._id,
          order: contents.length + 1,
        };
      }
      appendContent(content);
      return;
    }

    const topic = topics.find((item) => item._id === selectedTopic);
    const validQuestions = parsedQuestions.filter(isImportableQuestion);
    if (!subjectId || !topic) {
      setItemError("Vui lòng chọn môn học và chuyên đề để gắn câu hỏi.");
      return;
    }
    if (!assessmentFile || validQuestions.length === 0) {
      setItemError("Chọn tệp có ít nhất một câu hỏi hợp lệ.");
      return;
    }
    if (contentType === "exam" && assessmentTitle.trim().length < 3) {
      setItemError("Tên đề thi cần ít nhất 3 ký tự.");
      return;
    }

    setIsAddingContent(true);
    try {
      const formData = new FormData();
      formData.set("file", assessmentFile);
      formData.set("mode", contentType);
      formData.set("subject_id", subjectId);
      formData.set("topic_id", topic._id);
      formData.set("exam_title", assessmentTitle.trim());
      formData.set("duration_minutes", String(assessmentDuration));
      formData.set(
        "questions",
        JSON.stringify(
          validQuestions.map((question) => ({
            content: question.content,
            difficulty_level: question.difficulty_level,
            explanation: question.explanation,
            options: question.options,
          })),
        ),
      );
      const response = await fetch(
        "/api/instructor/roadmaps/import-file",
        { method: "POST", body: formData },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể nhập câu hỏi từ tệp.");
      }

      appendContent({
        content_type: contentType,
        title:
          contentType === "exam"
            ? data.title
            : `Tự luyện: ${topic.topic_name}`,
        exam_id: contentType === "exam" ? data.exam_id : undefined,
        topic_id: topic._id,
        resource_url: data.resource_url,
        file_name: data.file_name,
        order: contents.length + 1,
      });
    } catch (cause) {
      setItemError(
        cause instanceof Error
          ? cause.message
          : "Không thể nhập câu hỏi từ tệp.",
      );
    } finally {
      setIsAddingContent(false);
    }
  }

  async function handleAssessmentFile(file?: File) {
    if (!file) return;
    setAssessmentFile(file);
    setAssessmentTitle(file.name.replace(/\.[^.]+$/, ""));
    setIsParsing(true);
    setItemError("");
    try {
      const questions = await parseAssessmentFile(file);
      setParsedQuestions(questions);
      if (!questions.some(isImportableQuestion)) {
        setItemError(
          "Không tìm thấy câu hỏi hợp lệ. Hãy kiểm tra mẫu Excel hoặc định dạng câu hỏi trong Word/TXT.",
        );
      }
    } catch (cause) {
      setParsedQuestions([]);
      setItemError(
        cause instanceof Error ? cause.message : "Không thể đọc tệp câu hỏi.",
      );
    } finally {
      setIsParsing(false);
    }
  }

  function moveContent(contentIndex: number, direction: -1 | 1) {
    const targetIndex = contentIndex + direction;
    if (targetIndex < 0 || targetIndex >= contents.length) return;
    const reorderedContents = [...contents];
    [reorderedContents[contentIndex], reorderedContents[targetIndex]] = [
      reorderedContents[targetIndex],
      reorderedContents[contentIndex],
    ];
    onChange(
      reorderedContents.map((content, itemIndex) => ({
        ...content,
        order: itemIndex + 1,
      })),
    );
  }

  function removeContent(contentIndex: number) {
    onChange(
      contents
        .filter((_, itemIndex) => itemIndex !== contentIndex)
        .map((content, itemIndex) => ({ ...content, order: itemIndex + 1 })),
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {contents.map((content, contentIndex) => (
          <div
            key={content._id || `${content.content_type}-${content.order}-${content.title}`}
            className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950/70"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-300">
              {content.content_type === "exam"
                ? "ĐT"
                : content.content_type === "practice"
                  ? "TL"
                  : "BG"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                {content.title}
              </p>
              <p className="text-[11px] text-slate-500">
                {content.content_type === "exam"
                  ? "Đề thi thử"
                  : content.content_type === "practice"
                    ? "Bài tập tự luyện"
                    : "Bài giảng / tài liệu"}
                {content.file_name ? ` · ${content.file_name}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => moveContent(contentIndex, -1)}
              disabled={contentIndex === 0}
              aria-label="Di chuyển nội dung lên"
              className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30 dark:hover:bg-slate-800"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveContent(contentIndex, 1)}
              disabled={contentIndex === contents.length - 1}
              aria-label="Di chuyển nội dung xuống"
              className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30 dark:hover:bg-slate-800"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeContent(contentIndex)}
              aria-label="Gỡ nội dung"
              className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              ×
            </button>
          </div>
        ))}
        {contents.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-xs text-slate-500 dark:border-slate-700">
            Chưa có nội dung trong lộ trình.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["practice", "Bài tự luyện"],
              ["exam", "Đề thi thử"],
              ["lesson", "Tài liệu"],
            ] as const
          ).map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setContentType(type);
                setItemError("");
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                contentType === type
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {contentType !== "lesson" && (
          <div className="mt-3 flex gap-2">
            {(
              [
                ["file", "Tải file và nhập câu hỏi"],
                ["existing", "Chọn nội dung có sẵn"],
              ] as const
            ).map(([source, label]) => (
              <button
                key={source}
                type="button"
                onClick={() => {
                  setContentSource(source);
                  setItemError("");
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  contentSource === source
                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 space-y-2">
          {contentType === "exam" &&
            contentSource === "existing" && (
              <select
                value={selectedExam}
                onChange={(event) => setSelectedExam(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Chọn đề thi đã tạo</option>
                {exams.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.title}
                    {exam.is_published ? "" : " (bản nháp)"}
                  </option>
                ))}
              </select>
            )}
          {contentType === "practice" &&
            contentSource === "existing" && (
              <select
                value={selectedTopic}
                onChange={(event) => setSelectedTopic(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Chọn chuyên đề tự luyện</option>
                {topics.map((topic) => (
                  <option key={topic._id} value={topic._id}>
                    {topic.topic_name}
                  </option>
                ))}
              </select>
            )}
          {contentType !== "lesson" &&
            contentSource === "file" && (
              <>
                <select
                  value={selectedTopic}
                  onChange={(event) => setSelectedTopic(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Chọn chuyên đề lưu câu hỏi</option>
                  {topics.map((topic) => (
                    <option key={topic._id} value={topic._id}>
                      {topic.topic_name}
                    </option>
                  ))}
                </select>
                {contentType === "exam" && (
                  <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                    <input
                      value={assessmentTitle}
                      onChange={(event) => setAssessmentTitle(event.target.value)}
                      placeholder="Tên đề thi"
                      maxLength={255}
                      className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      Thời gian
                      <input
                        type="number"
                        min={1}
                        max={480}
                        value={assessmentDuration}
                        onChange={(event) =>
                          setAssessmentDuration(Number(event.target.value))
                        }
                        className="w-16 bg-transparent text-right outline-none"
                      />
                      phút
                    </label>
                  </div>
                )}
                <label className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {contentType === "exam"
                      ? "Tải đề thi để nhập thành bài thi tương tác"
                      : "Tải bộ câu hỏi để nhập thành bài tự luyện"}
                  </span>
                  <input
                    key={assessmentInputKey}
                    type="file"
                    accept=".xlsx,.xls,.csv,.docx,.txt,.md"
                    onChange={(event) =>
                      void handleAssessmentFile(event.target.files?.[0])
                    }
                    className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700"
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">
                    Excel/CSV hoặc Word/TXT theo mẫu câu hỏi trắc nghiệm.
                  </span>
                </label>
                {assessmentFile && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {isParsing
                      ? `Đang đọc ${assessmentFile.name}...`
                      : `${assessmentFile.name} · ${
                          parsedQuestions.filter(isImportableQuestion).length
                        } câu hợp lệ${
                          parsedQuestions.some(
                            (question) => !isImportableQuestion(question),
                          )
                            ? ` · ${
                                parsedQuestions.filter(
                                  (question) => !isImportableQuestion(question),
                                ).length
                              } câu bị bỏ qua`
                            : ""
                        }`}
                  </p>
                )}
              </>
            )}
          {contentType === "lesson" && (
            <>
              <select
                value={selectedLessonTopic}
                onChange={(event) =>
                  setSelectedLessonTopic(event.target.value)
                }
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Chọn bài học trong cây chủ đề (nếu có)</option>
                {topics
                  .filter((topic) => Number(topic.level) >= 2)
                  .map((topic) => (
                    <option key={topic._id} value={topic._id}>
                      {topic.topic_name}
                      {getSubjectName(topic.subject_id)
                        ? ` · ${getSubjectName(topic.subject_id)}`
                        : ""}
                    </option>
                  ))}
              </select>
              <input
                value={lessonTitle}
                onChange={(event) => setLessonTitle(event.target.value)}
                placeholder="Tên bài giảng/tài liệu (không bắt buộc)"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                key={materialInputKey}
                type="file"
                accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
                onChange={(event) =>
                  setMaterialFile(event.target.files?.[0] || null)
                }
                className="min-w-0 flex-1 text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700"
              />
            </>
          )}
          <button
            type="button"
            disabled={isAddingContent || isParsing}
            onClick={() => void addContent()}
            className="shrink-0 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            {isAddingContent
              ? "Đang tải và nhập..."
              : contentType !== "lesson" && contentSource === "file"
                ? "Nhập file và thêm"
                : "Thêm nội dung"}
          </button>
        </div>
        {itemError && (
          <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
            {itemError}
          </p>
        )}
      </div>
    </div>
  );
}

interface LeaderboardRow {
  user_id: string;
  name: string;
  avatar_url: string;
  completion_percentage: number;
  best_score: number;
  last_activity_at?: string;
}

function LeaderboardModal({
  roadmap,
  onClose,
}: {
  roadmap: RoadmapItem;
  onClose: () => void;
}) {
  const [sort, setSort] = useState<"progress" | "score">("progress");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    fetch(`/api/instructor/roadmaps/${roadmap._id}/leaderboard?sort=${sort}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Không thể tải bảng xếp hạng.");
        }
        if (!ignore) setRows(data.leaderboard || []);
      })
      .catch((cause: unknown) => {
        if (!ignore) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải bảng xếp hạng.",
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [roadmap._id, sort]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-6 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
              Thành tích học viên
            </p>
            <h2
              id="leaderboard-title"
              className="mt-1 text-xl font-bold text-slate-900 dark:text-white"
            >
              Bảng xếp hạng
            </h2>
            <p className="mt-1 max-w-md truncate text-sm text-slate-500">
              {roadmap.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng xếp hạng"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ×
          </button>
        </div>
        <div className="flex gap-2 px-6 pt-5">
          <button
            type="button"
            onClick={() => {
              if (sort === "progress") return;
              setLoading(true);
              setError("");
              setSort("progress");
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              sort === "progress"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            Tiến độ hoàn thành
          </button>
          <button
            type="button"
            onClick={() => {
              if (sort === "score") return;
              setLoading(true);
              setError("");
              setSort("score");
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              sort === "score"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            Điểm cao nhất
          </button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-6">
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Đang tải bảng xếp hạng...
            </p>
          ) : error ? (
            <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </p>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-xl dark:bg-indigo-950/50">
                ✦
              </div>
              <p className="font-semibold text-slate-800 dark:text-white">
                Chưa có học viên trong lộ trình
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Bảng xếp hạng sẽ cập nhật khi học viên tham gia.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div
                  key={row.user_id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3 dark:border-slate-800"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                      index === 0
                        ? "bg-amber-100 text-amber-700"
                        : index === 1
                          ? "bg-slate-200 text-slate-700"
                          : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {row.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.avatar_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
                      {row.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {row.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Hoàn thành {row.completion_percentage}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                      {row.best_score.toFixed(1)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      Điểm cao nhất
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const emptyDraft = (): RoadmapDraft => ({
  title: "",
  subject_id: "",
  description: "",
  price: 0,
  cover_image: "",
  contents: [],
});

function toDraft(roadmap: RoadmapItem): RoadmapDraft {
  return {
    title: roadmap.title,
    subject_id: roadmap.subject_id || "",
    description: roadmap.description || "",
    price: roadmap.price || 0,
    cover_image: roadmap.cover_image || "",
    contents: roadmap.contents.map((content, index) => ({
      ...content,
      order: index + 1,
    })),
  };
}

function formatPrice(price: number) {
  if (!price) return "Miễn phí";
  return `${new Intl.NumberFormat("vi-VN").format(price)} ₫`;
}

export default function RoadmapManagerView() {
  const [roadmaps, setRoadmaps] = useState<RoadmapItem[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRoadmapId, setEditingRoadmapId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoadmapDraft>(emptyDraft);
  const [draftPublished, setDraftPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [editorError, setEditorError] = useState("");
  const [leaderboardRoadmap, setLeaderboardRoadmap] = useState<RoadmapItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const responses = await Promise.all([
        fetch("/api/instructor/roadmaps"),
        fetch("/api/instructor/exams"),
        fetch("/api/instructor/subjects"),
      ]);
      const results = await Promise.all(
        responses.map(async (response) => ({
          ok: response.ok,
          data: await response.json(),
        })),
      );
      const failed = results.find(
        (result) => !result.ok || !result.data.success,
      );
      if (failed) {
        throw new Error(failed.data.message || "Không thể tải dữ liệu lộ trình.");
      }
      setRoadmaps(results[0].data.roadmaps || []);
      setExams(results[1].data.exams || []);
      setTopics(results[2].data.topics || []);
      setSubjects(results[2].data.subjects || []);
    } catch (cause) {
      setPageError(
        cause instanceof Error ? cause.message : "Không thể tải dữ liệu lộ trình.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetch("/api/instructor/roadmaps"),
      fetch("/api/instructor/exams"),
      fetch("/api/instructor/subjects"),
    ])
      .then(async (responses) => {
        const results = await Promise.all(
          responses.map(async (response) => ({
            ok: response.ok,
            data: await response.json(),
          })),
        );
        const failed = results.find(
          (result) => !result.ok || !result.data.success,
        );
        if (failed) {
          throw new Error(failed.data.message || "Không thể tải dữ liệu lộ trình.");
        }
        if (!ignore) {
          setRoadmaps(results[0].data.roadmaps || []);
          setExams(results[1].data.exams || []);
          setTopics(results[2].data.topics || []);
          setSubjects(results[2].data.subjects || []);
        }
      })
      .catch((cause: unknown) => {
        if (!ignore) {
          setPageError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải dữ liệu lộ trình.",
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const visibleRoadmaps = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("vi");
    return roadmaps.filter((roadmap) => {
      if (statusFilter === "published" && !roadmap.is_published) return false;
      if (statusFilter === "draft" && roadmap.is_published) return false;
      return (
        !normalizedSearch ||
        roadmap.title.toLocaleLowerCase("vi").includes(normalizedSearch) ||
        roadmap.description.toLocaleLowerCase("vi").includes(normalizedSearch)
      );
    });
  }, [roadmaps, search, statusFilter]);

  const publishedCount = roadmaps.filter((roadmap) => roadmap.is_published).length;
  const totalLearners = roadmaps.reduce(
    (total, roadmap) => total + roadmap.learner_count,
    0,
  );
  const roadmapTopics = topics.filter(
    (topic) => getReferenceId(topic.subject_id) === draft.subject_id,
  );
  const roadmapExams = exams.filter((exam) =>
    examMatchesSubject(exam, draft.subject_id),
  );

  function openCreateEditor() {
    setEditingRoadmapId(null);
    setDraft(emptyDraft());
    setDraftPublished(false);
    setEditorError("");
    setEditorOpen(true);
  }

  function openEditEditor(roadmap: RoadmapItem) {
    setEditingRoadmapId(roadmap._id);
    setDraft(toDraft(roadmap));
    setDraftPublished(roadmap.is_published);
    setEditorError("");
    setEditorOpen(true);
  }

  async function handleCoverUpload(file?: File) {
    if (!file) return;
    setUploadingCover(true);
    setEditorError("");
    try {
      const uploaded = await uploadRoadmapFile(file, "cover");
      setDraft((current) => ({ ...current, cover_image: uploaded.url }));
      setCoverInputKey((key) => key + 1);
    } catch (cause) {
      setEditorError(
        cause instanceof Error ? cause.message : "Không thể tải ảnh bìa lên.",
      );
    } finally {
      setUploadingCover(false);
    }
  }

  function updateContents(contents: RoadmapContent[]) {
    setDraft((current) => ({ ...current, contents }));
  }

  async function saveRoadmap(publish: boolean) {
    setEditorError("");
    if (publish && draft.contents.length === 0) {
      setEditorError("Trước khi xuất bản, hãy thêm ít nhất một nội dung.");
      return;
    }
    if (
      draft.price < 0 ||
      !Number.isFinite(draft.price) ||
      draft.title.trim().length < 3 ||
      !draft.subject_id
    ) {
      setEditorError("Vui lòng chọn môn học, nhập tên lộ trình hợp lệ và giá không âm.");
      return;
    }
    if (uploadingCover) {
      setEditorError("Vui lòng đợi ảnh bìa tải lên xong.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingRoadmapId
          ? `/api/instructor/roadmaps/${editingRoadmapId}`
          : "/api/instructor/roadmaps",
        {
          method: editingRoadmapId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draft,
            is_published: publish || draftPublished,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể lưu lộ trình.");
      }

      setEditorOpen(false);
      setNotice(
        publish || draftPublished
          ? "Lộ trình đã được lưu và xuất bản."
          : "Lộ trình đã được lưu dưới dạng bản nháp.",
      );
      await loadData();
    } catch (cause) {
      setEditorError(
        cause instanceof Error ? cause.message : "Không thể lưu lộ trình.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(roadmap: RoadmapItem) {
    const nextStatus = !roadmap.is_published;
    if (
      nextStatus &&
      roadmap.contents.length === 0
    ) {
      setNotice("Hãy thêm ít nhất một nội dung trước khi xuất bản.");
      return;
    }
    try {
      const response = await fetch(
        `/api/instructor/roadmaps/${roadmap._id}/publish`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_published: nextStatus }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(
          data.message || data.error || "Không thể cập nhật trạng thái.",
        );
      }
      setNotice(data.message);
      await loadData();
    } catch (cause) {
      setPageError(
        cause instanceof Error ? cause.message : "Không thể cập nhật trạng thái.",
      );
    }
  }

  async function deleteRoadmap(roadmap: RoadmapItem) {
    if (
      !window.confirm(
        `Xóa lộ trình "${roadmap.title}"? Thao tác này không thể hoàn tác.`,
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`/api/instructor/roadmaps/${roadmap._id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể xóa lộ trình.");
      }
      setNotice(data.message);
      await loadData();
    } catch (cause) {
      setPageError(
        cause instanceof Error ? cause.message : "Không thể xóa lộ trình.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-950/10 sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-100">
              Learning journeys
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Biến kiến thức thành hành trình
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
              Kết hợp bài tự luyện, đề thi thử và tài liệu trong một danh sách
              nội dung. Theo dõi học viên và xuất bản gói miễn phí hoặc có thu phí.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateEditor}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            <span className="text-lg leading-none">+</span>
            Tạo lộ trình mới
          </button>
        </div>
        <div className="pointer-events-none absolute -right-8 -top-20 h-72 w-72 rounded-full border-[34px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 right-40 h-56 w-56 rounded-full border-[24px] border-white/10" />
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="font-bold"
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}
      {pageError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <span>{pageError}</span>
          <button
            type="button"
            onClick={() => setPageError("")}
            className="font-bold"
            aria-label="Đóng thông báo lỗi"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Tổng lộ trình",
            value: roadmaps.length,
            detail: "đã tạo trong hệ thống",
            icon: "◫",
            color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
          },
          {
            label: "Đang xuất bản",
            value: publishedCount,
            detail: "có thể cung cấp cho học viên",
            icon: "↗",
            color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
          },
          {
            label: "Lượt tham gia",
            value: totalLearners,
            detail: "học viên đang theo học",
            icon: "◎",
            color: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <span
              className={`grid h-11 w-11 place-items-center rounded-xl text-lg font-bold ${stat.color}`}
            >
              {stat.icon}
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-[11px] text-slate-400">{stat.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Danh sách lộ trình
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Quản lý nội dung, giá bán, trạng thái và thành tích học viên.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <span className="sr-only">Tìm lộ trình</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm lộ trình..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 sm:w-56 dark:border-slate-700 dark:bg-slate-950"
              />
              <span className="absolute left-3 top-2 text-slate-400">⌕</span>
            </label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
              aria-label="Lọc trạng thái lộ trình"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="published">Đang xuất bản</option>
              <option value="draft">Bản nháp</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Đang tải lộ trình...
          </div>
        ) : visibleRoadmaps.length === 0 ? (
          <div className="my-5 rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              ◫
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white">
              {roadmaps.length === 0
                ? "Bắt đầu tạo lộ trình đầu tiên"
                : "Không tìm thấy lộ trình phù hợp"}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              {roadmaps.length === 0
                ? "Tạo nội dung học và thiết lập giá để chia sẻ với học viên."
                : "Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái."}
            </p>
            {roadmaps.length === 0 && (
              <button
                type="button"
                onClick={openCreateEditor}
                className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Tạo lộ trình
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {visibleRoadmaps.map((roadmap) => (
              <article
                key={roadmap._id}
                className="overflow-hidden rounded-2xl border border-slate-200 transition hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-900"
              >
                <div
                  className="relative h-36 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 bg-cover bg-center"
                  style={
                    roadmap.cover_image
                      ? { backgroundImage: `url("${roadmap.cover_image}")` }
                      : undefined
                  }
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                  <span
                    className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-bold ${
                      roadmap.is_published
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-white/90 text-slate-600"
                    }`}
                  >
                    {roadmap.is_published ? "Đang xuất bản" : "Bản nháp"}
                  </span>
                  <span className="absolute bottom-4 right-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-800">
                    {formatPrice(roadmap.price)}
                  </span>
                  <h3 className="absolute bottom-4 left-4 right-36 line-clamp-2 text-lg font-bold text-white">
                    {roadmap.title}
                  </h3>
                </div>
                <div className="p-4">
                  <p className="mb-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                    {roadmap.subject_name || "Chưa chọn môn học"}
                  </p>
                  <p className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                    {roadmap.description || "Chưa có mô tả quyền lợi."}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
                    <span>{roadmap.content_count} nội dung</span>
                    <span>{roadmap.learner_count} học viên</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditEditor(roadmap)}
                      className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderboardRoadmap(roadmap)}
                      className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Bảng xếp hạng
                    </button>
                    <button
                      type="button"
                      onClick={() => void togglePublish(roadmap)}
                      className="ml-auto rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {roadmap.is_published ? "Chuyển về nháp" : "Xuất bản"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteRoadmap(roadmap)}
                      className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="roadmap-editor-title"
            className="mx-auto my-2 max-w-4xl overflow-hidden rounded-3xl bg-slate-50 shadow-2xl dark:bg-slate-950 sm:my-6"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-7">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                  Thiết kế chương trình học
                </p>
                <h2
                  id="roadmap-editor-title"
                  className="mt-1 text-xl font-bold text-slate-900 dark:text-white"
                >
                  {editingRoadmapId ? "Chỉnh sửa lộ trình" : "Tạo lộ trình mới"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Đóng trình chỉnh sửa"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void saveRoadmap(false);
              }}
              className="max-h-[calc(100vh-7rem)] space-y-5 overflow-y-auto p-4 sm:p-7"
            >
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Thông tin lộ trình
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Giới thiệu rõ giá trị học viên nhận được khi tham gia.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Môn học <span className="text-rose-500">*</span>
                    </span>
                    <select
                      required
                      value={draft.subject_id}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          subject_id: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="">Chọn môn học cho lộ trình</option>
                      {subjects.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.subject_name}
                        </option>
                      ))}
                    </select>
                    {subjects.length === 0 && (
                      <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">
                        Chưa có môn học. Hãy tạo môn trong mục quản lý môn học trước.
                      </span>
                    )}
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Tên lộ trình <span className="text-rose-500">*</span>
                    </span>
                    <input
                      required
                      minLength={3}
                      maxLength={200}
                      value={draft.title}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Ví dụ: Chinh phục Toán 12 trong 8 tuần"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Mô tả và quyền lợi
                    </span>
                    <textarea
                      rows={3}
                      maxLength={5000}
                      value={draft.description}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Mô tả mục tiêu, nội dung, quyền lợi và kết quả học viên có thể đạt được..."
                      className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Giá bán (₫)
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={draft.price}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          price: Number(event.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950"
                    />
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Đặt giá 0 ₫ để cung cấp miễn phí.
                    </span>
                  </label>
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Ảnh bìa
                    </span>
                    <input
                      key={coverInputKey}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        void handleCoverUpload(event.target.files?.[0])
                      }
                      disabled={uploadingCover}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 disabled:opacity-50"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      {uploadingCover
                        ? "Đang tải ảnh..."
                        : draft.cover_image
                          ? "Đã có ảnh bìa. Tải ảnh mới để thay thế."
                          : "Tải ảnh JPG, PNG, WebP hoặc GIF."}
                    </p>
                    {draft.cover_image && (
                      <div className="mt-2 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={draft.cover_image}
                          alt="Xem trước ảnh bìa"
                          className="h-14 w-24 rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              cover_image: "",
                            }))
                          }
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Gỡ ảnh
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Nội dung lộ trình
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Sắp xếp bài tự luyện, đề thi thử và tài liệu theo thứ tự học.
                    </p>
                  </div>
                </div>
                <RoadmapContentsEditor
                  contents={draft.contents}
                  exams={roadmapExams}
                  topics={roadmapTopics}
                  subjectId={draft.subject_id}
                  onChange={updateContents}
                />
              </section>

              {editorError && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                >
                  {editorError}
                </p>
              )}
              {draft.subject_id &&
                roadmapExams.length === 0 &&
                roadmapTopics.length === 0 && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  Môn học này chưa có đề thi hoặc chuyên đề. Hãy tạo nội dung
                  thuộc môn đã chọn trước khi gắn vào lộ trình.
                </p>
              )}
              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/95 pt-4 backdrop-blur sm:flex-row sm:justify-end dark:border-slate-800 dark:bg-slate-950/95">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingCover}
                  className="rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300"
                >
                  {saving
                    ? "Đang lưu..."
                    : draftPublished
                      ? "Lưu thay đổi"
                      : "Lưu bản nháp"}
                </button>
                {!draftPublished && (
                  <button
                    type="button"
                    disabled={saving || uploadingCover}
                    onClick={() => void saveRoadmap(true)}
                    className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? "Đang lưu..." : "Lưu và xuất bản"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {leaderboardRoadmap && (
        <LeaderboardModal
          roadmap={leaderboardRoadmap}
          onClose={() => setLeaderboardRoadmap(null)}
        />
      )}
    </div>
  );
}
