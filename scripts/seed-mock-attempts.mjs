// scripts/seed-mock-attempts.mjs
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// Đọc file .env.local thủ công
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...values] = trimmed.split("=");
      if (key && values.length > 0) {
        process.env[key.trim()] = values
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadEnv();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai_quiz_app";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB successfully!");

  const db = mongoose.connection.db;

  // 1. Lấy danh sách users
  const users = await db.collection("users").find({}).toArray();
  const targetUserEmails = [
    "hoangnhan912004@gmail.com",
    "hoangnhan912004dn@gmail.com",
    "maitrunghieu@dtu.edu.vn",
    "trantiep0911@gmail.com",
    "nguyenkhang1.28102004@gmail.com",
    "phuclocan2004@gmail.com",
  ];

  const targetUsers = users.filter((u) => targetUserEmails.includes(u.email));
  if (targetUsers.length === 0) {
    console.error("Không tìm thấy người dùng phù hợp!");
    await mongoose.disconnect();
    return;
  }
  console.log(`Tìm thấy ${targetUsers.length} tài khoản để tạo mock data.`);

  // 2. Lấy danh sách câu hỏi và chuyên đề
  const allQuestions = await db.collection("questions").find({}).toArray();
  const allTopics = await db.collection("topics").find({}).toArray();
  const allExams = await db.collection("exams").find({}).toArray();

  if (allQuestions.length === 0) {
    console.error("Chưa có câu hỏi nào trong database!");
    await mongoose.disconnect();
    return;
  }

  console.log(`Hiện có ${allQuestions.length} câu hỏi và ${allTopics.length} chuyên đề.`);

  // Phân loại câu hỏi theo topic
  const questionsByTopic = new Map();
  for (const q of allQuestions) {
    const tId = String(q.topic_id);
    if (!questionsByTopic.has(tId)) {
      questionsByTopic.set(tId, []);
    }
    questionsByTopic.get(tId).push(q);
  }

  // Lấy vài topics tiêu biểu
  const topic1 = allTopics.find((t) => t.topic_name.includes("Cực trị") || t.topic_name.includes("Đồ thị")) || allTopics[0];
  const topic2 = allTopics.find((t) => t.topic_name.includes("Nguyên hàm") || t.topic_name.includes("Tích phân")) || allTopics[1] || allTopics[0];
  const topic3 = allTopics.find((t) => t.topic_name.includes("Mũ") || t.topic_name.includes("Logarit")) || allTopics[2] || allTopics[0];

  const exam1 = allExams[0] || null;

  // Helper hàm tạo bộ câu trả lời giả lập
  function buildAnswers(questionsList, targetCorrectCount) {
    const answers = [];
    questionsList.forEach((q, idx) => {
      const isCorrect = idx < targetCorrectCount;
      const opts = q.options || [];
      const correctOpt = opts.find((o) => o.is_correct) || opts[0];
      const wrongOpt = opts.find((o) => !o.is_correct) || opts[0];

      answers.push({
        _id: new mongoose.Types.ObjectId(),
        question_id: q._id,
        selected_option_id: isCorrect ? (correctOpt?._id || null) : (wrongOpt?._id || null),
        is_correct: isCorrect,
        answered_at: new Date(Date.now() - (questionsList.length - idx) * 45000),
      });
    });
    return answers;
  }

  // Xóa các mock attempts cũ (nếu có tiền tố MOCK_)
  await db.collection("examattempts").deleteMany({
    practice_title: { $regex: /^\[Mock\]/i },
  });
  console.log("Đã dọn dẹp các mock attempt cũ (nếu có).");

  let createdCount = 0;

  // Tạo mock data cho từng user
  for (const u of targetUsers) {
    const isMainTestUser = u.email === "hoangnhan912004@gmail.com" || u.email === "hoangnhan912004dn@gmail.com";

    // --- BÀI 1: Luyện tập Chuyên đề Khảo sát hàm số & Đồ thị ---
    const qSubset1 = allQuestions.slice(0, 10);
    const answers1 = buildAnswers(qSubset1, 7); // 7 đúng / 3 sai
    const attempt1 = {
      _id: new mongoose.Types.ObjectId(),
      user_id: u._id,
      attempt_type: "practice",
      topic_id: topic1?._id || null,
      exam_id: null,
      practice_title: "[Mock] Luyện tập: Khảo sát sự biến thiên & Đồ thị hàm số (Toán 12)",
      score: 7.0,
      total_correct: 7,
      total_wrong: 3,
      duration_seconds: 840, // 14 phút
      status: "submitted",
      start_time: new Date(Date.now() - 3 * 24 * 3600 * 1000 - 900 * 1000),
      submit_time: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      answers: answers1,
      violations: [],
      ai_analysis: {
        weak_points: "Học viên còn nhầm lẫn khi tìm điều kiện tham số m để hàm bậc 3 có 2 điểm cực trị cùng dấu; hay quên xét điều kiện mẫu số triệt tiêu khi xác định số đường tiệm cận đứng của đồ thị phân thức hữu tỉ.",
        ai_feedback: "Năng lực nhận diện đồ thị và đọc bảng biến thiên của bạn rất tốt (đạt 100% dạng đọc BBT). Bạn cần củng cố thêm phương pháp cô lập tham số m và ôn lại định lý Vi-ét cho tam thức bậc 2 đạo hàm y'. Hãy chú ý kiểm tra nghiệm triệt tiêu ở mẫu để không tính nhầm đường tiệm cận đứng.",
        recommended_topics: [topic1?._id, topic2?._id].filter(Boolean),
        created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      },
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    };

    // --- BÀI 2: Đề Ôn tập Tổng hợp: Nguyên hàm & Tích phân ---
    const qSubset2 = allQuestions.slice(10, 18).length >= 8 ? allQuestions.slice(10, 18) : allQuestions.slice(0, 8);
    const answers2 = buildAnswers(qSubset2, 4); // 4 đúng / 4 sai
    const attempt2 = {
      _id: new mongoose.Types.ObjectId(),
      user_id: u._id,
      attempt_type: "practice",
      topic_id: topic2?._id || null,
      exam_id: null,
      practice_title: "[Mock] Chuyên đề trọng tâm: Kỹ thuật đổi biến & Tích phân từng phần",
      score: 5.0,
      total_correct: 4,
      total_wrong: 4,
      duration_seconds: 720, // 12 phút
      status: "submitted",
      start_time: new Date(Date.now() - 1 * 24 * 3600 * 1000 - 750 * 1000),
      submit_time: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      answers: answers2,
      violations: [],
      ai_analysis: {
        weak_points: "Học viên chưa thành thạo thứ tự ưu tiên chọn ẩn u trong tích phân từng phần (nhất lô, nhì đa, tam lượng, tứ mũ). Thường quên đổi cận khi áp dụng phương pháp đổi biến số t = u(x).",
        ai_feedback: "Bạn đã thuộc tốt các công thức nguyên hàm cơ bản trong bảng chuẩn. Tuy nhiên khi gặp bài toán tích phân kết hợp hàm đa thức và hàm mũ/lượng giác, bạn còn lúng túng trong bước vi phân du và v. Hãy luyện tập thêm 10 bài tập tích phân từng phần dạng cơ bản trước khi chuyển sang các bài toán vận dụng cao.",
        recommended_topics: [topic2?._id, topic3?._id].filter(Boolean),
        created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      },
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    };

    // --- BÀI 3: Bài Test Nhanh Đạt Chuẩn Xuất Sắc: Đơn điệu & Cực trị ---
    const qSubset3 = allQuestions.slice(0, 5);
    const answers3 = buildAnswers(qSubset3, 5); // 5 đúng / 0 sai (10 điểm)
    const attempt3 = {
      _id: new mongoose.Types.ObjectId(),
      user_id: u._id,
      attempt_type: "practice",
      topic_id: topic1?._id || null,
      exam_id: exam1?._id || null,
      practice_title: "[Mock] Thi thử nhanh: Đơn điệu hàm số & Khảo sát bảng biến thiên",
      score: 10.0,
      total_correct: 5,
      total_wrong: 0,
      duration_seconds: 310, // ~5 phút
      status: "submitted",
      start_time: new Date(Date.now() - 2 * 3600 * 1000 - 320 * 1000),
      submit_time: new Date(Date.now() - 2 * 3600 * 1000),
      answers: answers3,
      violations: [],
      ai_analysis: {
        weak_points: "Không phát hiện lỗ hổng kiến thức nghiêm trọng ở bài làm này.",
        ai_feedback: "Xuất sắc! Học viên trả lời chính xác 100% các câu hỏi về xét dấu đạo hàm, tính đơn điệu và tìm cực trị trong thời gian rất ngắn (khoảng 1 phút/câu). Tư duy phân tích đồ thị hàm số rất chắc chắn. Hãy thử thách bản thân với các đề thi vận dụng cao ở chuyên đề tiếp theo!",
        recommended_topics: [topic3?._id, topic2?._id].filter(Boolean),
        created_at: new Date(Date.now() - 2 * 3600 * 1000),
      },
      createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 2 * 3600 * 1000),
    };

    // Lưu vào database
    await db.collection("examattempts").insertMany([attempt1, attempt2, attempt3]);
    createdCount += 3;

    if (isMainTestUser) {
      console.log(`✅ Đã tạo 3 bài mock attempts cho người dùng: ${u.email} (${u.name})`);
    }
  }

  console.log(`\n🎉 HOÀN THÀNH! Tổng cộng đã tạo ${createdCount} bài làm mock data.`);
  console.log("👉 Giờ bạn có thể mở http://localhost:3000/student/practice/history để xem lịch sử làm bài và AI phân tích!");
  console.log("👉 Hoặc mở http://localhost:3000/instructor/exams bấm nút 'Báo cáo AI' để xem chẩn đoán lớp học!");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});

