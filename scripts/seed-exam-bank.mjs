import mongoose from "mongoose";
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

// Mongoose Models
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
});

const SubjectSchema = new mongoose.Schema(
  {
    subject_name: { type: String, unique: true },
    description: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const TopicSchema = new mongoose.Schema(
  {
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
    topic_name: String,
    level: { type: Number, default: 1 },
    description: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const OptionSchema = new mongoose.Schema({
  option_label: String,
  content: String,
  is_correct: Boolean,
});

const QuestionSchema = new mongoose.Schema(
  {
    topic_id: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: String,
    difficulty_level: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    is_ai_generated: { type: Boolean, default: false },
    explanation: String,
    options: [OptionSchema],
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Subject = mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);
const Topic = mongoose.models.Topic || mongoose.model("Topic", TopicSchema);
const Question = mongoose.models.Question || mongoose.model("Question", QuestionSchema);

async function seedExamBank() {
  console.log("\n========================================================");
  console.log("🚀 TÁI THIẾT LẬP NGÂN HÀNG CÂU HỎI & CHUYÊN ĐỀ LUYỆN THI THPT");
  console.log("========================================================");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Kết nối MongoDB thành công!");

    // 1. Tìm tài khoản giáo viên quản trị ngân hàng câu hỏi
    let instructor = await User.findOne({ role: "instructor" });
    if (!instructor) {
      instructor = await User.findOne({ role: "admin" });
    }
    if (!instructor) {
      throw new Error("Không tìm thấy tài khoản giáo viên hoặc admin để gán câu hỏi.");
    }
    console.log(`👨‍🏫 Sử dụng tài khoản giảng viên: ${instructor.name} (${instructor.email})`);

    // 2. Dọn sạch toàn bộ Câu hỏi và Chủ đề cũ
    const deletedQuestions = await Question.deleteMany({});
    console.log(`🧹 Đã xóa sạch ${deletedQuestions.deletedCount} câu hỏi cũ.`);

    const deletedTopics = await Topic.deleteMany({});
    console.log(`🧹 Đã dọn dẹp ${deletedTopics.deletedCount} chủ đề bài giảng kiểu cũ.`);

    // 3. Cấu trúc Cây Chuyên Đề Ôn Thi Chuẩn Ma Trận Bộ GD&ĐT
    const curriculumData = [
      {
        subject_name: "Toán Học THPT",
        description: "Hệ thống chuyên đề ôn luyện thi Tốt nghiệp THPT & Đánh giá năng lực chuẩn Bộ GD-ĐT: Giải tích & Hình học",
        chapters: [
          {
            topic_name: "Chuyên đề 1: Đồ thị hàm số, Cực trị & Tương giao",
            description: "Trọng tâm nhận diện đồ thị, bảng biến thiên, cực trị và bài toán thực tế tối ưu",
            subtopics: [
              {
                topic_name: "Dạng 1: Đọc bảng biến thiên, đồ thị hàm f(x), f'(x) & Tính đơn điệu",
                description: "Nhận biết khoảng đồng biến, nghịch biến từ bảng biến thiên và đồ thị hàm số đạo hàm",
              },
              {
                topic_name: "Dạng 2: Cực trị hàm đa thức, phân thức & Biện luận tham số m",
                description: "Quy tắc tìm điểm cực đại, cực tiểu và điều kiện tham số m để hàm số có cực trị",
              },
              {
                topic_name: "Dạng 3: Giá trị lớn nhất - nhỏ nhất (GTLN-GTNN) & Đường tiệm cận",
                description: "Tìm min - max trên đoạn [a; b], xác định số đường tiệm cận đứng, tiệm cận ngang và tiệm cận xiên",
              },
            ],
          },
          {
            topic_name: "Chuyên đề 2: Nguyên hàm, Tích phân & Ứng dụng thực tế",
            description: "Kỹ thuật tính tích phân, ứng dụng diện tích hình phẳng và thể tích khối tròn xoay",
            subtopics: [
              {
                topic_name: "Dạng 1: Kỹ thuật đổi biến số & Tích phân từng phần",
                description: "Quy tắc đặt ẩn phụ u(x) và công thức tích phân từng phần kinh điển",
              },
              {
                topic_name: "Dạng 2: Ứng dụng tích phân tính Diện tích hình phẳng & Thể tích tròn xoay",
                description: "Tính diện tích giới hạn bởi 2 parabol, đường cong và thể tích khối tròn xoay quanh trục Ox",
              },
            ],
          },
          {
            topic_name: "Chuyên đề 3: Phương trình Mũ - Logarit & Bài toán tăng trưởng",
            description: "Biến đổi lũy thừa, logarit, phương trình - bất phương trình và mô hình lãi suất thực tế",
            subtopics: [
              {
                topic_name: "Dạng 1: Phương trình & Bất phương trình Mũ - Logarit cơ bản",
                description: "Đưa về cùng cơ số, đặt ẩn phụ và giải bất phương trình chú ý điều kiện cơ số",
              },
              {
                topic_name: "Dạng 2: Bài toán thực tế: Lãi suất ngân hàng & Tăng trưởng dân số",
                description: "Ứng dụng công thức lãi kép, quy luật tăng trưởng vi khuẩn và độ phóng xạ",
              },
            ],
          },
          {
            topic_name: "Chuyên đề 4: Phương pháp tọa độ trong không gian Oxyz",
            description: "Tọa độ điểm, vectơ, phương trình mặt phẳng, đường thẳng và mặt cầu",
            subtopics: [
              {
                topic_name: "Dạng 1: Phương trình mặt phẳng, đường thẳng & Tọa độ điểm",
                description: "Vectơ pháp tuyến, vectơ chỉ phương và phương trình chính tắc, tham số",
              },
              {
                topic_name: "Dạng 2: Phương trình mặt cầu & Bài toán khoảng cách, góc trong không gian",
                description: "Tâm và bán kính mặt cầu, khoảng cách từ điểm đến mặt phẳng và vị trí tương đối",
              },
            ],
          },
        ],
      },
      {
        subject_name: "Vật Lý THPT",
        description: "Chương trình Luyện thi THPT môn Vật Lý: Dao động cơ, Sóng cơ học và Dòng điện xoay chiều",
        chapters: [
          {
            topic_name: "Chuyên đề 1: Dao động điều hòa & Đồ thị dao động cơ",
            description: "Phương trình dao động, con lắc lò xo, con lắc đơn và đồ thị năng lượng",
            subtopics: [
              {
                topic_name: "Dạng 1: Đại cương dao động điều hòa, pha dao động & Trục thời gian",
                description: "Li độ, vận tốc, gia tốc, chu kỳ, tần số và mối quan hệ vuông pha độc lập thời gian",
              },
              {
                topic_name: "Dạng 2: Con lắc lò xo, con lắc đơn & Bảo toàn năng lượng dao động",
                description: "Động năng, thế năng, cơ năng và bài toán va chạm mềm, kéo nén lò xo",
              },
              {
                topic_name: "Dạng 3: Khai thác đồ thị li độ - thời gian & Lực đàn hồi, lực kéo về",
                description: "Đọc đồ thị dao động, xác định biên độ, chu kỳ và giá trị cực đại của lực phục hồi",
              },
            ],
          },
          {
            topic_name: "Chuyên đề 2: Sóng cơ học & Hiện tượng giao thoa sóng",
            description: "Đặc trưng truyền sóng, sóng dừng và giao thoa hai nguồn kết hợp",
            subtopics: [
              {
                topic_name: "Dạng 1: Đặc trưng truyền sóng, phương trình sóng & Độ lệch pha",
                description: "Bước sóng, tốc độ truyền sóng, phương trình sóng tại điểm M và điều kiện cùng pha, ngược pha",
              },
              {
                topic_name: "Dạng 2: Giao thoa sóng cơ & Xác định số điểm cực đại, cực tiểu",
                description: "Giao thoa hai nguồn cùng pha, điều kiện cực đại d2 - d1 = k.lambda và số điểm dao động",
              },
            ],
          },
          {
            topic_name: "Chuyên đề 3: Mạch điện xoay chiều RLC & Công suất tiêu thụ",
            description: "Mạch RLC không phân nhánh, hiện tượng cộng hưởng điện và hệ số công suất",
            subtopics: [
              {
                topic_name: "Dạng 1: Định luật Ôm cho đoạn mạch RLC nối tiếp & Giản đồ vectơ",
                description: "Tính tổng trở Z, độ lệch pha phi giữa u và i, viết biểu thức dòng điện",
              },
              {
                topic_name: "Dạng 2: Hiện tượng cộng hưởng điện & Cực trị công suất tiêu thụ",
                description: "Điều kiện ZL = ZC, công suất cực đại Pmax và hệ số công suất cos phi = 1",
              },
            ],
          },
        ],
      },
      {
        subject_name: "Hóa Học THPT",
        description: "Chương trình Luyện thi THPT môn Hóa Học: Hóa học hữu cơ (Este - Lipit) và Hóa học vô cơ (Kim loại kiềm, Nhôm)",
        chapters: [
          {
            topic_name: "Chuyên đề 1: Este - Lipit & Bài toán thủy phân chất béo",
            description: "Đồng phân, danh pháp este, phản ứng xà phòng hóa và bảo toàn khối lượng",
            subtopics: [
              {
                topic_name: "Dạng 1: Danh pháp, tính chất vật lý & Phản ứng xà phòng hóa este đơn chức",
                description: "Nhận biết este có mùi thơm đặc trưng, phản ứng thủy phân trong môi trường kiềm (NaOH, KOH)",
              },
              {
                topic_name: "Dạng 2: Bài toán thủy phân chất béo (Triglixerit) & Bảo toàn khối lượng",
                description: "Công thức tổng quát của triglixerit, phản ứng với NaOH thu được glixerol và muối axit béo",
              },
            ],
          },
          {
            topic_name: "Chuyên đề 2: Kim loại kiềm, kiềm thổ, Nhôm & Bài toán đồ thị vô cơ",
            description: "Tính chất kim loại nhóm IA, IIA, bài toán CO2 sục vào dung dịch kiềm và lưỡng tính của Al",
            subtopics: [
              {
                topic_name: "Dạng 1: Tính chất hóa học của kim loại kiềm, kiềm thổ & Nước cứng",
                description: "Độ tan, phản ứng với nước, tính khử mạnh của kim loại kiềm và phương pháp làm mềm nước cứng",
              },
              {
                topic_name: "Dạng 2: Bài toán khí CO2 sục vào dung dịch Ca(OH)2 / Ba(OH)2",
                description: "Biện luận kết tủa CaCO3, BaCO3 và giải toán dựa trên tỷ lệ số mol T = n(OH-) / n(CO2)",
              },
            ],
          },
        ],
      },
    ];

    // Map lưu topic theo tên để gắn câu hỏi chính xác
    const createdTopicsMap = new Map();

    for (const sData of curriculumData) {
      let subject = await Subject.findOne({ subject_name: sData.subject_name });
      if (!subject) {
        subject = await Subject.create({
          subject_name: sData.subject_name,
          description: sData.description,
          created_by: instructor._id,
        });
        console.log(`\n📚 [Môn mới] ${subject.subject_name}`);
      } else {
        subject.description = sData.description;
        await subject.save();
        console.log(`\n📚 [Cập nhật môn] ${subject.subject_name}`);
      }

      for (const ch of sData.chapters) {
        const rootTopic = await Topic.create({
          subject_id: subject._id,
          parent_id: null,
          topic_name: ch.topic_name,
          level: 1,
          description: ch.description,
          created_by: instructor._id,
        });
        console.log(`  ├── 🏷️ [Chuyên đề lớn] ${rootTopic.topic_name}`);
        createdTopicsMap.set(rootTopic.topic_name, rootTopic._id);

        for (const sub of ch.subtopics) {
          const subTopic = await Topic.create({
            subject_id: subject._id,
            parent_id: rootTopic._id,
            topic_name: sub.topic_name,
            level: 2,
            description: sub.description,
            created_by: instructor._id,
          });
          console.log(`  │    └── 🎯 [Dạng bài] ${subTopic.topic_name}`);
          createdTopicsMap.set(subTopic.topic_name, subTopic._id);
        }
      }
    }

    // 4. Danh sách câu hỏi ôn luyện chuẩn ma trận đề thi tốt nghiệp THPT
    const examQuestions = [
      // ===== TOÁN HỌC =====
      {
        topic_name: "Dạng 1: Đọc bảng biến thiên, đồ thị hàm f(x), f'(x) & Tính đơn điệu",
        content: "Cho hàm số y = f(x) có đạo hàm f'(x) = x(x - 2)(x + 1)^2 với mọi x thuộc R. Hàm số đã cho đồng biến trên khoảng nào dưới đây?",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\n1. Xét dấu f'(x): Ta thấy (x + 1)^2 >= 0 với mọi x, nên dấu của f'(x) hoàn toàn phụ thuộc vào tích x(x - 2).\n2. Ta có x(x - 2) > 0 <=> x < 0 hoặc x > 2.\n3. Do đó hàm số đồng biến trên các khoảng (-vô cùng; -1), (-1; 0) và (2; +vô cùng).\n=> Trong 4 phương án, khoảng (2; +vô cùng) là đáp án chính xác.\n\n⚠️ Bẫy nhận thức thường gặp: Học sinh hay quên rằng x = -1 là nghiệm bội chẵn nên qua x = -1 đạo hàm KHÔNG đổi dấu.",
        options: [
          { option_label: "A", content: "(2; +vô cùng)", is_correct: true },
          { option_label: "B", content: "(0; 2)", is_correct: false },
          { option_label: "C", content: "(-1; 2)", is_correct: false },
          { option_label: "D", content: "(-1; 0)", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 2: Cực trị hàm đa thức, phân thức & Biện luận tham số m",
        content: "Tìm tất cả các giá trị thực của tham số m để hàm số y = x^3 - 3mx^2 + 3(m^2 - 1)x + 2 đạt cực tiểu tại điểm x = 2.",
        difficulty_level: "medium",
        explanation: "Phương pháp giải:\n1. Ta có: y' = 3x^2 - 6mx + 3(m^2 - 1) = 3[x^2 - 2mx + m^2 - 1].\n2. Hàm số đạt cực trị tại x = 2 khi y'(2) = 0 <=> 3[4 - 4m + m^2 - 1] = 0 <=> m^2 - 4m + 3 = 0 <=> m = 1 hoặc m = 3.\n3. Kiểm tra lại điều kiện cực tiểu bằng đạo hàm cấp hai: y'' = 6x - 6m.\n- Với m = 1: y''(2) = 6(2) - 6(1) = 6 > 0 => x = 2 là điểm cực tiểu (Thỏa mãn).\n- Với m = 3: y''(2) = 6(2) - 6(3) = -6 < 0 => x = 2 là điểm cực đại (Loại).\nVậy m = 1 là giá trị duy nhất cần tìm.",
        options: [
          { option_label: "A", content: "m = 1", is_correct: true },
          { option_label: "B", content: "m = 3", is_correct: false },
          { option_label: "C", content: "m = 1 hoặc m = 3", is_correct: false },
          { option_label: "D", content: "m = -1", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 3: Giá trị lớn nhất - nhỏ nhất (GTLN-GTNN) & Đường tiệm cận",
        content: "Tổng số đường tiệm cận đứng và tiệm cận ngang của đồ thị hàm số y = (x - 2) / (x^2 - 4) là:",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\n1. Tập xác định: D = R \\ {-2; 2}.\n2. Rút gọn phân thức với x khác 2: y = (x - 2) / [(x - 2)(x + 2)] = 1 / (x + 2).\n3. Tiệm cận ngang: lim(x -> +-vô cùng) y = 0 => y = 0 là tiệm cận ngang duy nhất (1 đường).\n4. Tiệm cận đứng: lim(x -> -2+) y = +vô cùng => x = -2 là tiệm cận đứng duy nhất. Lưu ý: Tại x = 2, lim(x -> 2) y = 1/4 (hữu hạn) nên x = 2 KHÔNG phải là tiệm cận đứng.\n=> Tổng số đường tiệm cận là 1 + 1 = 2 đường.\n\n⚠️ Bẫy nhận thức: Học sinh nhìn mẫu số x^2 - 4 = 0 vội kết luận có 2 tiệm cận đứng x = +-2 là sai lầm vì x = 2 bị triệt tiêu với tử số.",
        options: [
          { option_label: "A", content: "2", is_correct: true },
          { option_label: "B", content: "3", is_correct: false },
          { option_label: "C", content: "1", is_correct: false },
          { option_label: "D", content: "0", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 1: Kỹ thuật đổi biến số & Tích phân từng phần",
        content: "Cho tích phân I = tích phân từ 0 đến 1 của x.e^(2x) dx. Giá trị của I bằng:",
        difficulty_level: "medium",
        explanation: "Phương pháp giải bằng tích phân từng phần:\n1. Đặt u = x => du = dx.\n2. dv = e^(2x) dx => chọn v = (1/2)e^(2x).\n3. Công thức: I = u.v|[0; 1] - tích phân từ 0 đến 1 của v du.\n= (1/2)x.e^(2x)|[0; 1] - (1/2) tích phân từ 0 đến 1 của e^(2x) dx\n= (1/2)e^2 - (1/4)e^(2x)|[0; 1]\n= (1/2)e^2 - [(1/4)e^2 - 1/4] = (1/4)e^2 + 1/4 = (e^2 + 1) / 4.\nĐáp án chính xác: (e^2 + 1) / 4.",
        options: [
          { option_label: "A", content: "(e^2 + 1) / 4", is_correct: true },
          { option_label: "B", content: "(e^2 - 1) / 4", is_correct: false },
          { option_label: "C", content: "(e^2 + 1) / 2", is_correct: false },
          { option_label: "D", content: "e^2 / 4", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 2: Ứng dụng tích phân tính Diện tích hình phẳng & Thể tích tròn xoay",
        content: "Diện tích S của hình phẳng giới hạn bởi đồ thị hàm số y = x^2 - 4x + 3 và trục hoành Ox bằng:",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\n1. Phương trình hoành độ giao điểm: x^2 - 4x + 3 = 0 <=> x = 1 hoặc x = 3.\n2. Diện tích S = tích phân từ 1 đến 3 của |x^2 - 4x + 3| dx.\n3. Trên đoạn [1; 3], parabol nằm dưới trục hoành (y <= 0), do đó:\nS = - tích phân từ 1 đến 3 của (x^2 - 4x + 3) dx = - [x^3/3 - 2x^2 + 3x]|[1; 3]\n= - [(9 - 18 + 9) - (1/3 - 2 + 3)] = - [0 - 4/3] = 4/3 (đơn vị diện tích).",
        options: [
          { option_label: "A", content: "4/3", is_correct: true },
          { option_label: "B", content: "2/3", is_correct: false },
          { option_label: "C", content: "8/3", is_correct: false },
          { option_label: "D", content: "1/3", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 1: Phương trình & Bất phương trình Mũ - Logarit cơ bản",
        content: "Nghiệm của phương trình logarit cơ số 2 của (x - 3) = 3 là:",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\n1. Điều kiện xác định: x - 3 > 0 <=> x > 3.\n2. Ta có phương trình: log_2(x - 3) = 3 <=> x - 3 = 2^3 = 8 <=> x = 11.\n3. So sánh điều kiện x = 11 > 3 (thỏa mãn).\nVậy nghiệm của phương trình là x = 11.",
        options: [
          { option_label: "A", content: "x = 11", is_correct: true },
          { option_label: "B", content: "x = 9", is_correct: false },
          { option_label: "C", content: "x = 8", is_correct: false },
          { option_label: "D", content: "x = 12", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 1: Phương trình mặt phẳng, đường thẳng & Tọa độ điểm",
        content: "Trong không gian Oxyz, cho mặt phẳng (P): 2x - y + 3z - 5 = 0. Một vectơ pháp tuyến của mặt phẳng (P) là:",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\nMặt phẳng dạng Ax + By + Cz + D = 0 có một vectơ pháp tuyến là n = (A; B; C).\nTừ phương trình (P): 2x - y + 3z - 5 = 0, ta có hệ số A = 2, B = -1, C = 3.\nDo đó một vectơ pháp tuyến của (P) là n = (2; -1; 3).",
        options: [
          { option_label: "A", content: "n = (2; -1; 3)", is_correct: true },
          { option_label: "B", content: "n = (2; 1; 3)", is_correct: false },
          { option_label: "C", content: "n = (2; -1; -5)", is_correct: false },
          { option_label: "D", content: "n = (-1; 3; -5)", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 2: Phương trình mặt cầu & Bài toán khoảng cách, góc trong không gian",
        content: "Trong không gian Oxyz, bán kính R của mặt cầu (S): (x - 1)^2 + (y + 2)^2 + (z - 3)^2 = 16 bằng:",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\nMặt cầu có dạng chuẩn: (x - a)^2 + (y - b)^2 + (z - c)^2 = R^2.\nỞ đây vế phải là 16 = 4^2, do đó bán kính mặt cầu là R = sqrt(16) = 4.\n(Tâm mặt cầu là I(1; -2; 3)).",
        options: [
          { option_label: "A", content: "R = 4", is_correct: true },
          { option_label: "B", content: "R = 16", is_correct: false },
          { option_label: "C", content: "R = 2", is_correct: false },
          { option_label: "D", content: "R = 8", is_correct: false },
        ],
      },

      // ===== VẬT LÝ =====
      {
        topic_name: "Dạng 1: Đại cương dao động điều hòa, pha dao động & Trục thời gian",
        content: "Một vật dao động điều hòa theo phương trình x = 6.cos(4pi.t + pi/3) (cm). Biên độ và tần số góc của dao động lần lượt là:",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\n1. Phương trình chuẩn của dao động điều hòa: x = A.cos(omega.t + phi).\n2. Đối chiếu phương trình đề bài: A = 6 cm, tần số góc omega = 4pi rad/s, pha ban đầu phi = pi/3 rad.\nVậy biên độ là 6 cm và tần số góc là 4pi rad/s.",
        options: [
          { option_label: "A", content: "6 cm và 4pi rad/s", is_correct: true },
          { option_label: "B", content: "6 cm và 2pi rad/s", is_correct: false },
          { option_label: "C", content: "3 cm và 4pi rad/s", is_correct: false },
          { option_label: "D", content: "12 cm và 4 rad/s", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 2: Con lắc lò xo, con lắc đơn & Bảo toàn năng lượng dao động",
        content: "Một con lắc lò xo gồm vật nặng m = 100g gắn vào lò xo có độ cứng k = 40 N/m dao động điều hòa với biên độ A = 5 cm. Cơ năng của con lắc bằng:",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\n1. Đổi đơn vị: A = 5 cm = 0,05 m.\n2. Cơ năng của con lắc lò xo được tính theo công thức: W = (1/2).k.A^2.\n3. Thay số: W = 0,5 * 40 * (0,05)^2 = 20 * 0,0025 = 0,05 J = 50 mJ.\n\n⚠️ Bẫy thường gặp: Quên đổi đơn vị biên độ từ cm sang mét dẫn đến kết quả sai 10.000 lần.",
        options: [
          { option_label: "A", content: "0,05 J", is_correct: true },
          { option_label: "B", content: "0,5 J", is_correct: false },
          { option_label: "C", content: "5 J", is_correct: false },
          { option_label: "D", content: "50 J", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 1: Đặc trưng truyền sóng, phương trình sóng & Độ lệch pha",
        content: "Một sóng cơ hình sin truyền trong một môi trường đàn hồi với bước sóng lambda = 20 cm. Khoảng cách giữa hai điểm gần nhau nhất trên cùng một phương truyền sóng dao động ngược pha nhau là:",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\n1. Hai điểm trên cùng phương truyền sóng dao động ngược pha nhau cách nhau một khoảng: d = (2k + 1).(lambda / 2).\n2. Điểm gần nhau nhất ứng với k = 0, do đó: d_min = lambda / 2.\n3. Thay số: d_min = 20 / 2 = 10 cm.",
        options: [
          { option_label: "A", content: "10 cm", is_correct: true },
          { option_label: "B", content: "20 cm", is_correct: false },
          { option_label: "C", content: "5 cm", is_correct: false },
          { option_label: "D", content: "40 cm", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 1: Định luật Ôm cho đoạn mạch RLC nối tiếp & Giản đồ vectơ",
        content: "Đặt điện áp xoay chiều u = U0.cos(100pi.t) (V) vào hai đầu đoạn mạch RLC nối tiếp có R = 30 ôm, ZL = 70 ôm, ZC = 30 ôm. Tổng trở Z của đoạn mạch là:",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\n1. Công thức tổng trở của đoạn mạch RLC mắc nối tiếp:\nZ = sqrt( R^2 + (ZL - ZC)^2 ).\n2. Thay số: Z = sqrt( 30^2 + (70 - 30)^2 ) = sqrt( 30^2 + 40^2 ) = sqrt(900 + 1600) = sqrt(2500) = 50 ôm.",
        options: [
          { option_label: "A", content: "50 ôm", is_correct: true },
          { option_label: "B", content: "70 ôm", is_correct: false },
          { option_label: "C", content: "100 ôm", is_correct: false },
          { option_label: "D", content: "40 ôm", is_correct: false },
        ],
      },

      // ===== HÓA HỌC =====
      {
        topic_name: "Dạng 1: Danh pháp, tính chất vật lý & Phản ứng xà phòng hóa este đơn chức",
        content: "Este etyl axetat có công thức cấu tạo thu gọn là:",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\n1. Etyl axetat được tạo thành từ axit axetic (CH3COOH) và ancol etylic (C2H5OH).\n2. Gốc axit axetic là CH3COO-, gốc etyl là -C2H5.\nDo đó công thức cấu tạo của etyl axetat là CH3COOC2H5.",
        options: [
          { option_label: "A", content: "CH3COOC2H5", is_correct: true },
          { option_label: "B", content: "HCOOC2H5", is_correct: false },
          { option_label: "C", content: "CH3COOCH3", is_correct: false },
          { option_label: "D", content: "C2H5COOCH3", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 2: Bài toán thủy phân chất béo (Triglixerit) & Bảo toàn khối lượng",
        content: "Xà phòng hóa hoàn toàn 17,8 gam tristearin bằng dung dịch NaOH vừa đủ, thu được m gam glixerol. Giá trị của m là:",
        difficulty_level: "medium",
        explanation: "Phương pháp giải:\n1. Công thức của tristearin là (C17H35COO)3C3H5 có phân tử khối M = 890 g/mol.\n2. Số mol tristearin: n = 17,8 / 890 = 0,02 mol.\n3. Phương trình phản ứng xà phòng hóa:\n(C17H35COO)3C3H5 + 3NaOH -> 3C17H35COONa + C3H5(OH)3\n4. Theo phương trình: n_glixerol = n_tristearin = 0,02 mol.\n5. Khối lượng glixerol: m = 0,02 * 92 = 1,84 gam.",
        options: [
          { option_label: "A", content: "1,84 gam", is_correct: true },
          { option_label: "B", content: "0,92 gam", is_correct: false },
          { option_label: "C", content: "3,68 gam", is_correct: false },
          { option_label: "D", content: "2,76 gam", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 1: Tính chất hóa học của kim loại kiềm, kiềm thổ & Nước cứng",
        content: "Kim loại nào sau đây thuộc nhóm kim loại kiềm (nhóm IA trong bảng tuần hoàn)?",
        difficulty_level: "easy",
        explanation: "Phương pháp giải:\nCác kim loại kiềm thuộc nhóm IA gồm: Li (Liti), Na (Natri), K (Kali), Rb (Rubiđi), Cs (Xesi), Fr (Franxi).\nTrong các đáp án đã cho, Natri (Na) là kim loại kiềm. (Ca, Ba thuộc kim loại kiềm thổ nhóm IIA, Al thuộc nhóm IIIA).",
        options: [
          { option_label: "A", content: "Natri (Na)", is_correct: true },
          { option_label: "B", content: "Canxi (Ca)", is_correct: false },
          { option_label: "C", content: "Nhôm (Al)", is_correct: false },
          { option_label: "D", content: "Bari (Ba)", is_correct: false },
        ],
      },
      {
        topic_name: "Dạng 2: Bài toán khí CO2 sục vào dung dịch Ca(OH)2 / Ba(OH)2",
        content: "Sục hoàn toàn 2,24 lít khí CO2 (đktc) vào 150 ml dung dịch Ca(OH)2 1M. Khối lượng kết tủa CaCO3 thu được là:",
        difficulty_level: "medium",
        explanation: "Phương pháp giải:\n1. Số mol CO2: n_CO2 = 2,24 / 22,4 = 0,1 mol.\n2. Số mol Ca(OH)2: n_Ca(OH)2 = 0,15 * 1 = 0,15 mol => n_OH- = 2 * 0,15 = 0,3 mol.\n3. Xét tỷ lệ T = n_OH- / n_CO2 = 0,3 / 0,1 = 3 > 2.\n=> Phản ứng chỉ tạo muối trung hòa CO3(2-) và Ca(OH)2 còn dư.\n4. Phương trình: CO2 + Ca(OH)2 -> CaCO3 kết tủa + H2O.\nVì n_Ca(OH)2 (0,15 mol) > n_CO2 (0,1 mol) nên kết tủa tính theo CO2:\nn_CaCO3 = n_CO2 = 0,1 mol.\n5. Khối lượng kết tủa: m = 0,1 * 100 = 10 gam.",
        options: [
          { option_label: "A", content: "10,0 gam", is_correct: true },
          { option_label: "B", content: "15,0 gam", is_correct: false },
          { option_label: "C", content: "5,0 gam", is_correct: false },
          { option_label: "D", content: "7,5 gam", is_correct: false },
        ],
      },
    ];

    function shuffleOptions(options) {
      const labels = ["A", "B", "C", "D"];
      const shuffled = [...options];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.map((opt, idx) => ({
        option_label: labels[idx],
        content: opt.content,
        is_correct: opt.is_correct,
      }));
    }

    const answerStats = { A: 0, B: 0, C: 0, D: 0 };
    let insertedCount = 0;
    for (const q of examQuestions) {
      const topicId = createdTopicsMap.get(q.topic_name);
      if (!topicId) {
        console.warn(`⚠️ Không tìm thấy topicId cho chuyên đề: ${q.topic_name}`);
        continue;
      }

      const randomizedOptions = shuffleOptions(q.options);
      const correctOpt = randomizedOptions.find((o) => o.is_correct);
      if (correctOpt) {
        answerStats[correctOpt.option_label]++;
      }

      await Question.create({
        topic_id: topicId,
        created_by: instructor._id,
        content: q.content,
        difficulty_level: q.difficulty_level,
        is_ai_generated: false,
        explanation: q.explanation,
        options: randomizedOptions,
      });
      insertedCount++;
    }

    console.log(`\n🎉 Đã nạp thành công ${insertedCount} câu hỏi luyện thi chất lượng cao vào ngân hàng!`);
    console.log(`📊 Phân bổ đáp án đúng ngẫu nhiên: A: ${answerStats.A} | B: ${answerStats.B} | C: ${answerStats.C} | D: ${answerStats.D}`);
    console.log("========================================================\n");

  } catch (error) {
    console.error("❌ Lỗi trong quá trình seed ngân hàng câu hỏi:", error);
  } finally {
    await mongoose.disconnect();
  }
}

seedExamBank();
