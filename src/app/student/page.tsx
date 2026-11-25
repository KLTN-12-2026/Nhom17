//src\app\student\page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import RoleDashboardShell from "@/components/dashboard/role-dashboard-shell";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import { ExamAttempt, Question, Subject, Topic } from "@/models";
import mongoose from "mongoose";
import KnowledgeGapCardAndModal, {
  WeakTopicItem,
  ImprovedTopicItem,
} from "@/components/student/knowledge-gap-card-and-modal";

interface IPopulatedSubject {
  _id: mongoose.Types.ObjectId;
  subject_name: string;
}

interface IPopulatedTopic {
  _id: mongoose.Types.ObjectId;
  topic_name: string;
  level: number;
  subject_id?: IPopulatedSubject | null;
}

interface IPopulatedExam {
  _id: mongoose.Types.ObjectId;
  title: string;
  max_score?: number;
  subject_id?: IPopulatedSubject | null;
}

interface IAttemptDoc {
  _id: mongoose.Types.ObjectId;
  topic_id?: IPopulatedTopic | null;
  exam_id?: IPopulatedExam | null;
  attempt_type?: "practice" | "official";
  practice_title?: string;
  score?: number;
  total_correct?: number;
  total_wrong?: number;
  duration_seconds?: number;
  status: string;
  submit_time?: Date | null;
  createdAt: Date;
}

function formatDuration(seconds?: number): string {
  if (typeof seconds !== "number" || seconds <= 0) return "< 1 phút";
  if (seconds < 60) return `${seconds} giây`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} phút`;
  return `${mins} phút ${secs}s`;
}

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/student");
  }

  if (user.role === "instructor") {
    redirect("/instructor");
  }

  if (user.role === "admin") {
    redirect("/admin");
  }

  // Kết nối CSDL và lấy dữ liệu THẬT của học viên
  await connectDB();

  const userObjId = new mongoose.Types.ObjectId(user.id);

  // 1. Lấy toàn bộ các bài thi/bài luyện đã nộp (bao gồm cả tự động thu khi hết giờ)
  const userAttempts = (await ExamAttempt.find({
    user_id: userObjId,
    status: { $in: ["submitted", "timed_out"] },
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "topic_id",
      select: "topic_name level subject_id",
      populate: {
        path: "subject_id",
        select: "subject_name",
      },
    })
    .populate({
      path: "exam_id",
      select: "title max_score subject_id",
      populate: {
        path: "subject_id",
        select: "subject_name",
      },
    })
    .lean()) as unknown as IAttemptDoc[];

  // 2. Tính toán 4 chỉ số Metric Cards (quy chuẩn về thang điểm 10 khi tổng hợp)
  const getNormalizedScore10 = (a: IAttemptDoc) => {
    const maxS = a.exam_id?.max_score || 10;
    const rawS = a.score || 0;
    return maxS > 0 ? (rawS / maxS) * 10 : rawS;
  };

  const totalSubmitted = userAttempts.length;
  const practiceCount = userAttempts.filter(
    (a) => a.attempt_type === "practice" || (!a.exam_id && a.topic_id)
  ).length;
  const officialCount = userAttempts.filter(
    (a) => a.attempt_type === "official" || (a.exam_id && !a.topic_id)
  ).length;

  const passedCount = userAttempts.filter(
    (a) => getNormalizedScore10(a) >= 5
  ).length;
  const passRate =
    totalSubmitted > 0
      ? Math.round((passedCount / totalSubmitted) * 1000) / 10
      : 0;

  const totalScoreSum = userAttempts.reduce(
    (sum, a) => sum + getNormalizedScore10(a),
    0
  );
  const avgScore =
    totalSubmitted > 0 ? Math.round((totalScoreSum / totalSubmitted) * 10) / 10 : 0;

  let gradeLabel = "Chưa có bài nộp";
  let gradeColor = "text-slate-400";
  if (totalSubmitted > 0) {
    if (avgScore >= 8) {
      gradeLabel = "Xếp loại: Giỏi toàn diện";
      gradeColor = "text-blue-600 dark:text-blue-400";
    } else if (avgScore >= 6.5) {
      gradeLabel = "Xếp loại: Khá vững";
      gradeColor = "text-indigo-600 dark:text-indigo-400";
    } else if (avgScore >= 5) {
      gradeLabel = "Xếp loại: Đạt chuẩn";
      gradeColor = "text-emerald-600 dark:text-emerald-400";
    } else {
      gradeLabel = "Xếp loại: Cần nỗ lực thêm";
      gradeColor = "text-amber-600 dark:text-amber-400";
    }
  }

  const totalQuestionsPracticed = userAttempts.reduce(
    (sum, a) => sum + (a.total_correct || 0) + (a.total_wrong || 0),
    0
  );
  const totalCorrectPracticed = userAttempts.reduce(
    (sum, a) => sum + (a.total_correct || 0),
    0
  );
  const accuracyRate =
    totalQuestionsPracticed > 0
      ? Math.round((totalCorrectPracticed / totalQuestionsPracticed) * 100)
      : 0;

  // 3. Phân tích lỗ hổng kiến thức & Đánh giá theo tiến độ học tập (Mastery Learning)
  interface ITopicProgressTracking {
    _id: string;
    name: string;
    subjectName: string;
    latestScore: number;
    highestScore: number;
    lowestScore: number;
    attemptsCount: number;
  }

  const topicProgressMap = new Map<string, ITopicProgressTracking>();

  for (const att of userAttempts) {
    if (att.topic_id?.topic_name) {
      const tid = String(att.topic_id._id);
      const score = typeof att.score === "number" ? att.score : 0;
      const existing = topicProgressMap.get(tid);

      if (!existing) {
        // Vì userAttempts đã sort theo createdAt: -1 nên phần tử đầu tiên gặp chính là LẦN LÀM MỚI NHẤT
        topicProgressMap.set(tid, {
          _id: tid,
          name: att.topic_id.topic_name,
          subjectName: att.topic_id.subject_id?.subject_name || "Môn học chung",
          latestScore: score,
          highestScore: score,
          lowestScore: score,
          attemptsCount: 1,
        });
      } else {
        existing.attemptsCount += 1;
        if (score > existing.highestScore) existing.highestScore = score;
        if (score < existing.lowestScore) existing.lowestScore = score;
      }
    }
  }

  // Chuyên đề THỰC SỰ cần cải thiện: Lần làm gần nhất < 6.5 VÀ chưa từng đạt >= 7.0
  const weakTopics: WeakTopicItem[] = [];
  // Chuyên đề vừa khắc phục thành công: Từng bị < 6.5 nhưng lần làm gần nhất đã bứt phá >= 7.0
  const improvedTopics: ImprovedTopicItem[] = [];

  topicProgressMap.forEach((stat) => {
    if (stat.latestScore < 6.5 && stat.highestScore < 7.0) {
      weakTopics.push({
        _id: stat._id,
        name: stat.name,
        subjectName: stat.subjectName,
        latestScore: stat.latestScore,
        attemptsCount: stat.attemptsCount,
      });
    } else if (stat.attemptsCount >= 2 && stat.lowestScore < 6.5 && stat.latestScore >= 7.0) {
      improvedTopics.push({
        _id: stat._id,
        name: stat.name,
        subjectName: stat.subjectName,
        lowestScore: stat.lowestScore,
        latestScore: stat.latestScore,
      });
    }
  });

  // 4. Lấy danh sách Môn Học THPT thật và tính độ phủ dạng bài & ngân hàng câu hỏi
  const allSubjects = await Subject.find().sort({ subject_name: 1 }).lean();

  // Lấy toàn bộ topics để phân loại theo môn
  const allTopics = await Topic.find()
    .select("_id subject_id parent_id level topic_name")
    .lean();

  // Map subtopics (Dạng bài: level === 2 hoặc có parent_id) theo subject_id
  const subjectSubtopicsMap = new Map<string, mongoose.Types.ObjectId[]>();
  // Map tất cả topicIds theo subject_id
  const subjectAllTopicIdsMap = new Map<string, mongoose.Types.ObjectId[]>();

  for (const t of allTopics) {
    const sid = String(t.subject_id);
    const allList = subjectAllTopicIdsMap.get(sid) || [];
    allList.push(t._id as mongoose.Types.ObjectId);
    subjectAllTopicIdsMap.set(sid, allList);

    // Dạng bài là topic có parent_id hoặc level >= 2
    if (t.parent_id || (t.level && t.level >= 2)) {
      const subList = subjectSubtopicsMap.get(sid) || [];
      subList.push(t._id as mongoose.Types.ObjectId);
      subjectSubtopicsMap.set(sid, subList);
    }
  }

  // Tập hợp các topic_id (dạng bài) mà học sinh ĐÃ TỪNG LUYỆN
  const practicedTopicIdSet = new Set<string>();
  for (const att of userAttempts) {
    if (att.topic_id?._id) {
      practicedTopicIdSet.add(String(att.topic_id._id));
    }
  }

  const subjectProgressList = await Promise.all(
    allSubjects.map(async (sub, idx) => {
      const sid = String(sub._id);
      const subtopicIds = subjectSubtopicsMap.get(sid) || [];
      const allTopicIds = subjectAllTopicIdsMap.get(sid) || [];

      // Tổng số dạng bài ôn luyện của môn này (nếu môn chưa chia dạng bài thì dùng allTopicIds)
      const targetTopicIds = subtopicIds.length > 0 ? subtopicIds : allTopicIds;
      const totalUnits = targetTopicIds.length;

      // Số dạng bài học sinh đã hoàn thành ít nhất 1 bài tự luyện
      let completedUnits = 0;
      for (const tid of targetTopicIds) {
        if (practicedTopicIdSet.has(String(tid))) {
          completedUnits += 1;
        }
      }

      // Tổng số câu hỏi trong ngân hàng của môn này
      const totalQuestionsInBank = await Question.countDocuments({
        topic_id: { $in: allTopicIds },
      });

      // Phần trăm độ phủ dạng bài thực tế (0 - 100%)
      const percent =
        totalUnits > 0
          ? Math.min(100, Math.round((completedUnits / totalUnits) * 100))
          : 0;

      const colors = ["bg-blue-600", "bg-indigo-600", "bg-amber-600", "bg-emerald-600", "bg-purple-600"];

      return {
        _id: sid,
        name: sub.subject_name,
        completedUnits,
        totalUnits,
        totalInBank: totalQuestionsInBank,
        percent,
        color: colors[idx % colors.length],
      };
    })
  );

  // 5. Tính số ngày đếm ngược đến kỳ thi THPT Quốc Gia (dự kiến cuối tháng 6/2026)
  const examTargetDate = new Date("2026-06-25T07:30:00+07:00");
  const now = new Date();
  const diffMs = examTargetDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Lấy 4 bài làm gần nhất
  const recentAttempts = userAttempts.slice(0, 4);

  return (
    <RoleDashboardShell
      user={user}
      title="Bàn Học Trực Tuyến & Luyện Thi AI"
      subtitle="Theo dõi tiến độ học tập, tham gia phòng thi trực tuyến và nhận gợi ý thông minh từ AI"
      actions={
        <Link
          href="/student/join-room"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>Vào Phòng Thi Live</span>
        </Link>
      }
    >
      {/* Banner Đếm ngược kỳ thi & Động lực học tập */}
      <div className="relative rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 p-6 sm:p-8 text-white mb-8 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-blue-100 backdrop-blur-md mb-3 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Lộ Trình Bứt Phá Mục Tiêu Điểm 8.5+
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              Chào bạn {user.name ? user.name.split(" ").slice(-1)[0] : "học viên"}! 👋
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-blue-100 leading-relaxed font-normal">
              Mỗi ngày hoàn thành 1 chuyên đề trắc nghiệm là bạn đã tiến thêm một bước vững chắc đến cánh cửa trường đại học mơ ước. Hãy cùng AI bứt phá hôm nay!
            </p>
          </div>

          {/* Hộp đếm ngược kỳ thi */}
          <div className="shrink-0 flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <div className="text-center px-3 py-1 border-r border-white/20">
              <span className="block text-2xl sm:text-3xl font-black text-amber-300">
                {daysRemaining}
              </span>
              <span className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">
                Ngày thi THPT
              </span>
            </div>
            <div className="text-left text-xs leading-tight pr-2">
              <div className="font-bold text-white">Kỳ thi Tốt nghiệp 2026</div>
              <div className="text-[11px] text-blue-200 mt-0.5">Mục tiêu: Đạt 26+ Khối A/A1/B/D</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards - DỮ LIỆU THẬT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Card 1: Lượt Luyện Đã Nộp */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lượt Luyện Đã Nộp
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {totalSubmitted} <span className="text-base font-normal text-slate-400">lượt</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span>↑</span>
            <span>
              {totalSubmitted > 0
                ? `${practiceCount} tự luyện${officialCount > 0 ? ` • ${officialCount} thi phòng` : ""} (Đạt chuẩn: ${passRate}%)`
                : "Chưa có lượt nộp bài"}
            </span>
          </div>
        </div>

        {/* Card 2: Điểm trung bình */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Điểm Trung Bình
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {avgScore} <span className="text-base font-normal text-slate-400">/ 10</span>
          </div>
          <div className={`mt-2 text-xs font-semibold ${gradeColor}`}>
            {gradeLabel}
          </div>
        </div>

        {/* Card 3: Câu hỏi đã luyện */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Câu Hỏi Đã Luyện
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {totalQuestionsPracticed} <span className="text-base font-normal text-slate-400">câu</span>
          </div>
          <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-semibold">
            {totalQuestionsPracticed > 0
              ? `Độ chính xác trung bình: ${accuracyRate}%`
              : "Sẵn sàng tự luyện"}
          </div>
        </div>

        {/* Card 4: Cảnh Báo Lỗ Hổng AI (Bấm để xem chi tiết & Luyện ngay) */}
        <KnowledgeGapCardAndModal
          weakTopics={weakTopics}
          improvedTopics={improvedTopics}
          totalSubmitted={totalSubmitted}
        />
      </div>

      {/* Main Student Hub (2 cột: Vào phòng thi + Trợ lý AI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Join Live Room Prompt */}
        <div className="lg:col-span-2 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 max-w-lg">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              Phòng Thi Thời Gian Thực (Socket.IO)
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">
              Nhập mã phòng thi từ giáo viên
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 mb-6 leading-relaxed">
              Bạn có mã ca thi do thầy cô cấp? Nhập mã phòng (ví dụ:{" "}
              <code className="bg-white/20 px-2 py-0.5 rounded font-mono font-bold">
                THI-TOAN-101
              </code>
              ) để bước vào phòng thi trực tiếp, kết nối giám sát webcam AI và làm bài tính giờ chuẩn.
            </p>
            <form
              action="/student/join-room"
              method="GET"
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                name="room_code"
                placeholder="Nhập mã phòng (VD: THI-TOAN-101)"
                className="px-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 font-mono font-bold text-sm outline-none focus:ring-4 focus:ring-white/30 flex-1 uppercase"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 active:scale-95 transition shadow-lg shrink-0 cursor-pointer"
              >
                Vào Phòng Thi →
              </button>
            </form>
          </div>
        </div>

        {/* AI Tutor Insights - CHẨN ĐOÁN THẬT DỰA TRÊN LỊCH SỬ HỌC SINH */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Chẩn Đoán Từ Gemini AI
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              {improvedTopics.length > 0 && weakTopics.length > 0 ? (
                <>
                  🎉 &ldquo;Chúc mừng bạn đã bứt phá ở dạng bài:{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {improvedTopics[0].name}
                  </strong>{" "}
                  ({improvedTopics[0].latestScore}/10đ). Tuy nhiên, hệ thống nhận thấy bạn vẫn còn{" "}
                  <strong className="text-amber-600 dark:text-amber-400 font-bold">
                    {weakTopics.length} chuyên đề
                  </strong>{" "}
                  cần củng cố thêm. Hãy luyện thêm vài câu để vững vàng nhé!&rdquo;
                </>
              ) : improvedTopics.length > 0 ? (
                <>
                  🎉 &ldquo;Xuất sắc! Bạn đã có bước tiến vượt bậc ở dạng bài:{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {improvedTopics[0].name}
                  </strong>{" "}
                  (vừa bứt phá lên{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {improvedTopics[0].latestScore}/10 điểm
                  </strong>
                  ). Lỗ hổng kiến thức này đã được bạn khắc phục hoàn toàn!&rdquo;
                </>
              ) : weakTopics.length > 0 ? (
                <>
                  &ldquo;Qua các bài tự luyện gần đây, bạn còn gặp khó khăn ở dạng bài:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {weakTopics.map((t) => t.name).slice(0, 2).join(", ")}
                  </strong>
                  . Đề xuất làm thêm 5-10 câu trắc nghiệm dạng này để củng cố phương pháp giải nhanh!&rdquo;
                </>
              ) : totalSubmitted > 0 ? (
                <>
                  &ldquo;Bạn đang duy trì phong độ rất tốt với độ chính xác đạt{" "}
                  <strong className="text-emerald-600">{accuracyRate}%</strong>. Hãy tiếp tục thử sức với các dạng bài vận dụng cao để nâng cao điểm số mục tiêu!&rdquo;
                </>
              ) : (
                <>
                  &ldquo;Chào mừng bạn đến với góc học tập THPT! Hãy chọn một dạng bài bất kỳ trong ngân hàng câu hỏi để tự luyện, AI sẽ lập tức phân tích điểm mạnh và điểm yếu cho bạn.&rdquo;
                </>
              )}
            </p>

            <div className="space-y-2.5">
              {/* Khối 1: Chủ đề cần cải thiện (Lỗ hổng) */}
              {weakTopics.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                  <div className="font-bold flex items-center justify-between gap-1 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Chủ đề cần cải thiện ({weakTopics.length}):</span>
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                      Chưa đạt 7.0đ
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {weakTopics.slice(0, 3).map((wt) => (
                      <span
                        key={wt._id}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 font-medium border border-amber-200/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-[11px] truncate max-w-full"
                        title={`${wt.name} - ${wt.latestScore}/10 điểm`}
                      >
                        {wt.name} (<strong>{wt.latestScore}đ</strong>)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Khối 2: Chủ đề vừa bứt phá thành công */}
              {improvedTopics.length > 0 && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="font-bold flex items-center gap-1.5 mb-1.5">
                    <span>✓</span>
                    <span>Chủ đề vừa bứt phá thành công:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {improvedTopics.slice(0, 2).map((it) => (
                      <span
                        key={it._id}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[11px]"
                      >
                        {it.name} ({it.lowestScore}đ → {it.latestScore}đ)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/student/practice"
              className="w-full inline-block text-center py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
            >
              Luyện tập bổ trợ kiến thức →
            </Link>
          </div>
        </div>
      </div>

      {/* KHU VỰC CHI TIẾT: Lịch Sử Bài Thi & Tiến Độ Môn Học */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bảng bài thi gần đây (DỮ LIỆU THẬT) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Lịch Sử Luyện Đề Gần Nhất
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các bài thi trắc nghiệm bạn đã hoàn thành gần đây
              </p>
            </div>
            <Link
              href="/student/practice/history"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>

          {recentAttempts.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-xl">
                📝
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Bạn chưa hoàn thành bài thi hay bài tự luyện nào
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hãy bắt đầu củng cố kiến thức bằng các bài tập trắc nghiệm theo dạng bài.
              </p>
              <Link
                href="/student/practice"
                className="mt-3 inline-block px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition"
              >
                Bắt đầu tự luyện ngay →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentAttempts.map((test) => {
                const title =
                  test.practice_title ||
                  (test.topic_id?.topic_name
                    ? `Ôn tập: ${test.topic_id.topic_name}`
                    : test.exam_id?.title || "Bài tự luyện kiến thức");
                const subject =
                  test.topic_id?.subject_id?.subject_name ||
                  test.exam_id?.subject_id?.subject_name ||
                  "Môn học chung";

                const dateStr = test.submit_time
                  ? new Date(test.submit_time).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : new Date(test.createdAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    });

                const timeSpent = formatDuration(test.duration_seconds);

                let badge = "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
                let status = "Cần Cải Thiện";
                const sc = test.score || 0;
                const maxSc = test.exam_id?.max_score || 10;
                const normSc = maxSc > 0 ? (sc / maxSc) * 10 : sc;
                if (normSc >= 8) {
                  badge = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
                  status = "Đạt Giỏi";
                } else if (normSc >= 6.5) {
                  badge = "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
                  status = "Khá Giỏi";
                } else if (normSc >= 5) {
                  badge = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300";
                  status = "Đạt Chuẩn";
                }

                const totalQ = (test.total_correct || 0) + (test.total_wrong || 0);
                const correctQ = test.total_correct || 0;

                return (
                  <div
                    key={String(test._id)}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-2xl transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {subject}
                        </span>
                        <span className="text-[11px] text-slate-400">• {dateStr}</span>
                        <span className="text-[11px] text-slate-400">• {timeSpent}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-0.5">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            {sc}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">/ {maxSc}đ</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Đúng {correctQ}/{totalQ > 0 ? totalQ : 1} câu
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-xl shrink-0 ${badge}`}>
                        {status}
                      </span>
                      <Link
                        href={`/student/practice/history?review=${test._id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition pl-1 shrink-0"
                        title="Xem lại chi tiết bài làm & lời giải"
                      >
                        <span>Xem lại</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cột tiến độ theo môn học THPT - DỮ LIỆU THẬT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Tiến Độ Môn Thi Trọng Tâm
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Độ phủ dạng bài & ngân hàng câu hỏi THPT
            </p>

            <div className="space-y-4">
              {subjectProgressList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Chưa có môn học nào trong hệ thống.
                </div>
              ) : (
                subjectProgressList.map((sub) => (
                  <div key={sub._id}>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-800 dark:text-slate-200">{sub.name}</span>
                      <span className="text-slate-500 font-medium">
                        {sub.completedUnits} / {sub.totalUnits} dạng bài ({sub.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${sub.color} transition-all duration-500`}
                        style={{ width: `${sub.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              href="/student/practice"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Luyện thêm dạng bài để tăng độ phủ kiến thức →
            </Link>
          </div>
        </div>
      </div>
    </RoleDashboardShell>
  );
}
