import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...values] = trimmed.split("=");
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai_quiz_app";

// Schemas
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: { type: String, select: false },
  role: String,
  status: { type: String, default: "active" },
  is_active: { type: Boolean, default: true },
});

const SubjectSchema = new mongoose.Schema({
  subject_name: { type: String, unique: true },
  description: String,
});

const TopicSchema = new mongoose.Schema({
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
  topic_name: String,
  level: { type: Number, default: 1 },
  description: String,
});

const OptionSchema = new mongoose.Schema({
  option_label: String,
  content: String,
  is_correct: Boolean,
});

const QuestionSchema = new mongoose.Schema({
  topic_id: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  difficulty_level: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
  is_ai_generated: { type: Boolean, default: false },
  explanation: String,
  options: [OptionSchema],
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Subject = mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);
const Topic = mongoose.models.Topic || mongoose.model("Topic", TopicSchema);
const Question = mongoose.models.Question || mongoose.model("Question", QuestionSchema);

async function seedQuestionBank() {
  console.log("\n========================================================");
  console.log("📚 NẠP DỮ LIỆU MẪU: NGÂN HÀNG CÂU HỎI LUYỆN THI THPT");
  console.log("========================================================");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Kết nối MongoDB thành công!");

    // 1. Tạo hoặc lấy tài khoản Giáo viên THPT
    const teacherEmail = "thayhung.toan@dtu.edu.vn";
    let teacher = await User.findOne({ email: teacherEmail });
    if (!teacher) {
      const hashedPassword = await bcrypt.hash("Pass@123456", 12);
      teacher = await User.create({
        name: "Thầy Nguyễn Văn Hưng (GV Chuyên Toán THPT)",
        email: teacherEmail,
        password: hashedPassword,
        role: "instructor",
        status: "active",
        is_active: true,
      });
      console.log(`✅ Đã tạo tài khoản Giáo viên: ${teacherEmail} / Pass@123456`);
    } else {
      console.log(`ℹ️ Đã tìm thấy tài khoản Giáo viên: ${teacher.name}`);
    }

    // 2. Tạo Môn học THPT
    const mathSubject = await Subject.findOneAndUpdate(
      { subject_name: "Toán Học THPT" },
      {
        subject_name: "Toán Học THPT",
        description: "Chương trình ôn luyện thi tốt nghiệp THPT Quốc Gia môn Toán (Lớp 12)",
      },
      { upsert: true, new: true }
    );

    const physicsSubject = await Subject.findOneAndUpdate(
      { subject_name: "Vật Lý THPT" },
      {
        subject_name: "Vật Lý THPT",
        description: "Chương trình ôn luyện thi tốt nghiệp THPT Quốc Gia môn Vật Lý (Lớp 12)",
      },
      { upsert: true, new: true }
    );
    console.log("✅ Đã khởi tạo 2 môn học: Toán Học THPT & Vật Lý THPT");

    // 3. Tạo Cây Chủ Đề Toán Học
    const topicHamSo = await Topic.findOneAndUpdate(
      { subject_id: mathSubject._id, topic_name: "Ứng dụng đạo hàm khảo sát hàm số", level: 1 },
      {
        subject_id: mathSubject._id,
        topic_name: "Ứng dụng đạo hàm khảo sát hàm số",
        level: 1,
        description: "Chương 1 Giải tích 12: Đơn điệu, Cực trị, GTLN - GTNN, Tiệm cận",
      },
      { upsert: true, new: true }
    );

    const topicCucTri = await Topic.findOneAndUpdate(
      { subject_id: mathSubject._id, topic_name: "Cực trị và Tính đơn điệu", level: 2 },
      {
        subject_id: mathSubject._id,
        parent_id: topicHamSo._id,
        topic_name: "Cực trị và Tính đơn điệu",
        level: 2,
        description: "Quy tắc tìm cực trị hàm đa thức, hàm phân thức và hàm hợp",
      },
      { upsert: true, new: true }
    );

    const topicGTLN = await Topic.findOneAndUpdate(
      { subject_id: mathSubject._id, topic_name: "Giá trị lớn nhất và nhỏ nhất (GTLN & GTNN)", level: 2 },
      {
        subject_id: mathSubject._id,
        parent_id: topicHamSo._id,
        topic_name: "Giá trị lớn nhất và nhỏ nhất (GTLN & GTNN)",
        level: 2,
        description: "Phương pháp tìm min - max trên đoạn [a; b]",
      },
      { upsert: true, new: true }
    );

    const topicTichPhan = await Topic.findOneAndUpdate(
      { subject_id: mathSubject._id, topic_name: "Nguyên hàm - Tích phân & Ứng dụng", level: 1 },
      {
        subject_id: mathSubject._id,
        topic_name: "Nguyên hàm - Tích phân & Ứng dụng",
        level: 1,
        description: "Chương 3 Giải tích 12: Kỹ thuật tính nguyên hàm, tích phân từng phần",
      },
      { upsert: true, new: true }
    );

    const topicOxyz = await Topic.findOneAndUpdate(
      { subject_id: mathSubject._id, topic_name: "Hình học không gian Oxyz", level: 1 },
      {
        subject_id: mathSubject._id,
        topic_name: "Hình học không gian Oxyz",
        level: 1,
        description: "Hệ tọa độ trong không gian, phương trình mặt phẳng, đường thẳng và mặt cầu",
      },
      { upsert: true, new: true }
    );

    const topicDaoDong = await Topic.findOneAndUpdate(
      { subject_id: physicsSubject._id, topic_name: "Dao động cơ & Con lắc lò xo", level: 1 },
      {
        subject_id: physicsSubject._id,
        topic_name: "Dao động cơ & Con lắc lò xo",
        level: 1,
        description: "Chương 1 Vật lý 12: Phương trình dao động điều hòa, con lắc lò xo",
      },
      { upsert: true, new: true }
    );
    console.log("✅ Đã thiết lập cây chủ đề phân cấp cho các môn học");

    // 4. Xóa câu hỏi mẫu cũ và nạp bộ câu hỏi mới chất lượng cao
    await Question.deleteMany({ created_by: teacher._id });

    const sampleQuestions = [
      {
        topic_id: topicCucTri._id,
        created_by: teacher._id,
        content: "Cho hàm số y = f(x) có đạo hàm f'(x) = x(x - 1)(x + 2)^3 với mọi x thuộc R. Số điểm cực trị của hàm số đã cho là bao nhiêu?",
        difficulty_level: "easy",
        is_ai_generated: false,
        explanation: "Ta xét dấu f'(x). Nghiệm x = -2 là nghiệm bội 3 (bội lẻ) nên f'(x) đổi dấu khi qua x = -2. Nghiệm x = 0 và x = 1 là nghiệm bội đơn (đổi dấu). Vậy hàm số có tất cả 3 điểm cực trị.",
        options: [
          { option_label: "A", content: "3 điểm cực trị", is_correct: true },
          { option_label: "B", content: "2 điểm cực trị", is_correct: false },
          { option_label: "C", content: "1 điểm cực trị", is_correct: false },
          { option_label: "D", content: "5 điểm cực trị", is_correct: false },
        ],
      },
      {
        topic_id: topicGTLN._id,
        created_by: teacher._id,
        content: "Tìm giá trị lớn nhất M của hàm số f(x) = x^3 - 3x^2 + 2 trên đoạn [0; 3].",
        difficulty_level: "easy",
        is_ai_generated: false,
        explanation: "Ta có f'(x) = 3x^2 - 6x = 0 <=> x = 0 hoặc x = 2 (đều thuộc đoạn [0; 3]). Tính các giá trị: f(0) = 2, f(2) = -2, f(3) = 2. Vậy GTLN của hàm số là M = 2 tại x = 0 và x = 3.",
        options: [
          { option_label: "A", content: "M = 2", is_correct: true },
          { option_label: "B", content: "M = -2", is_correct: false },
          { option_label: "C", content: "M = 0", is_correct: false },
          { option_label: "D", content: "M = 4", is_correct: false },
        ],
      },
      {
        topic_id: topicTichPhan._id,
        created_by: teacher._id,
        content: "Tính tích phân I = ∫ (từ 0 đến 1) của (2x + 1)e^x dx.",
        difficulty_level: "medium",
        is_ai_generated: false,
        explanation: "Đặt u = 2x + 1 => du = 2dx; dv = e^x dx => v = e^x. Theo công thức tích phân từng phần: I = [(2x + 1)e^x] (từ 0 đến 1) - ∫ 2e^x dx = (3e - 1) - [2e^x] (từ 0 đến 1) = (3e - 1) - (2e - 2) = e + 1.",
        options: [
          { option_label: "A", content: "I = e + 1", is_correct: true },
          { option_label: "B", content: "I = e - 1", is_correct: false },
          { option_label: "C", content: "I = 2e - 1", is_correct: false },
          { option_label: "D", content: "I = 3e + 2", is_correct: false },
        ],
      },
      {
        topic_id: topicTichPhan._id,
        created_by: teacher._id,
        content: "Cho hàm số f(x) liên tục trên R thỏa mãn ∫ (từ 0 đến 6) f(x)dx = 12. Tính tích phân J = ∫ (từ 0 đến 2) f(3x)dx.",
        difficulty_level: "easy",
        is_ai_generated: true,
        explanation: "Đặt t = 3x => dt = 3dx => dx = dt / 3. Đổi cận: x = 0 => t = 0; x = 2 => t = 6. Khi đó: J = ∫ (từ 0 đến 6) f(t) (dt/3) = (1/3) * 12 = 4.",
        options: [
          { option_label: "A", content: "J = 4", is_correct: true },
          { option_label: "B", content: "J = 36", is_correct: false },
          { option_label: "C", content: "J = 6", is_correct: false },
          { option_label: "D", content: "J = 2", is_correct: false },
        ],
      },
      {
        topic_id: topicCucTri._id,
        created_by: teacher._id,
        content: "Có bao nhiêu giá trị nguyên của tham số m thuộc đoạn [-10; 10] để hàm số y = (x - 2)/(x - m) đồng biến trên khoảng (1; +vô cùng)?",
        difficulty_level: "hard",
        is_ai_generated: true,
        explanation: "Tập xác định: D = R \\ {m}. Đạo hàm: y' = (-m + 2)/(x - m)^2. Để hàm số đồng biến trên (1; +vô cùng) thì: 1) y' > 0 <=> -m + 2 > 0 <=> m < 2. 2) Điểm gián đoạn x = m không thuộc (1; +vô cùng) <=> m <= 1. Kết hợp lại: m <= 1. Vì m nguyên thuộc [-10; 10] nên m nhận các giá trị: -10, -9, ..., 1. Tổng cộng có 1 - (-10) + 1 = 12 giá trị.",
        options: [
          { option_label: "A", content: "12 giá trị", is_correct: true },
          { option_label: "B", content: "11 giá trị", is_correct: false },
          { option_label: "C", content: "10 giá trị", is_correct: false },
          { option_label: "D", content: "9 giá trị", is_correct: false },
        ],
      },
      {
        topic_id: topicOxyz._id,
        created_by: teacher._id,
        content: "Trong không gian Oxyz, cho mặt cầu (S): (x - 1)^2 + (y + 2)^2 + (z - 3)^2 = 16. Tọa độ tâm I và bán kính R của mặt cầu là:",
        difficulty_level: "easy",
        is_ai_generated: false,
        explanation: "Phương trình mặt cầu dạng chính tắc: (x - a)^2 + (y - b)^2 + (z - c)^2 = R^2. Suy ra tâm I(1; -2; 3) và bán kính R = căn(16) = 4.",
        options: [
          { option_label: "A", content: "I(1; -2; 3), R = 4", is_correct: true },
          { option_label: "B", content: "I(-1; 2; -3), R = 4", is_correct: false },
          { option_label: "C", content: "I(1; -2; 3), R = 16", is_correct: false },
          { option_label: "D", content: "I(-1; 2; -3), R = 16", is_correct: false },
        ],
      },
      {
        topic_id: topicOxyz._id,
        created_by: teacher._id,
        content: "Trong không gian Oxyz, viết phương trình mặt phẳng (P) đi qua điểm M(1; 2; -3) và có vectơ pháp tuyến n = (2; -1; 3).",
        difficulty_level: "medium",
        is_ai_generated: true,
        explanation: "Phương trình mặt phẳng đi qua M(xo; yo; zo) có VTPT n(A; B; C) là: A(x - xo) + B(y - yo) + C(z - zo) = 0 <=> 2(x - 1) - 1(y - 2) + 3(z + 3) = 0 <=> 2x - y + 3z + 9 = 0.",
        options: [
          { option_label: "A", content: "2x - y + 3z + 9 = 0", is_correct: true },
          { option_label: "B", content: "2x - y + 3z - 9 = 0", is_correct: false },
          { option_label: "C", content: "2x + y - 3z - 9 = 0", is_correct: false },
          { option_label: "D", content: "x + 2y - 3z + 5 = 0", is_correct: false },
        ],
      },
      {
        topic_id: topicDaoDong._id,
        created_by: teacher._id,
        content: "Một con lắc lò xo gồm vật nặng khối lượng m = 200g và lò xo có độ cứng k = 50 N/m. Chu kỳ dao động riêng của con lắc là:",
        difficulty_level: "easy",
        is_ai_generated: false,
        explanation: "Công thức chu kỳ con lắc lò xo: T = 2π * √(m/k) = 2π * √(0.2 / 50) = 2π * √(0.004) ≈ 0.4s (lấy π^2 = 10).",
        options: [
          { option_label: "A", content: "T = 0.40 s", is_correct: true },
          { option_label: "B", content: "T = 0.20 s", is_correct: false },
          { option_label: "C", content: "T = 1.25 s", is_correct: false },
          { option_label: "D", content: "T = 2.50 s", is_correct: false },
        ],
      },
    ];

    const inserted = await Question.insertMany(sampleQuestions);
    console.log(`🎉 NẠP THÀNH CÔNG ${inserted.length} CÂU HỎI TRẮC NGHIỆM THPT VÀO DATABASE!`);

    await mongoose.disconnect();
    console.log("========================================================\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi nạp câu hỏi mẫu:", error);
    process.exit(1);
  }
}

seedQuestionBank();
