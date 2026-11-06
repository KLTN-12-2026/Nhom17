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

const Subject = mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);
const Topic = mongoose.models.Topic || mongoose.model("Topic", TopicSchema);

async function upsertTopic({ subject_id, parent_id = null, topic_name, level, description }) {
  let doc = await Topic.findOne({ subject_id, parent_id, topic_name });
  if (!doc) {
    doc = await Topic.create({
      subject_id,
      parent_id,
      topic_name,
      level,
      description,
    });
  }
  return doc;
}

async function seedSubjectsTree() {
  console.log("\n========================================================");
  console.log("🌳 KHỞI TẠO CÂY DANH MỤC CHỦ ĐỀ KIẾN THỨC ĐA CẤP (MẪU)");
  console.log("========================================================");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Kết nối MongoDB thành công!");

    const treeData = [
      {
        subject_name: "Toán Học THPT",
        description: "Chương trình Toán THPT chuẩn Bộ GD-ĐT: Giải tích, Đại số và Hình học không gian",
        chapters: [
          {
            topic_name: "Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số",
            description: "Xét tính đơn điệu, cực trị, giá trị lớn nhất - nhỏ nhất và tiệm cận",
            children: [
              {
                topic_name: "Bài 1.1: Tính đơn điệu và cực trị của hàm số",
                description: "Xét dấu đạo hàm y' và tìm điểm cực đại, cực tiểu",
                children: [
                  {
                    topic_name: "Dạng 1: Tìm tham số m để hàm bậc 3 đơn điệu trên R",
                    description: "Bất phương trình bậc hai với biệt thức Delta <= 0",
                  },
                  {
                    topic_name: "Dạng 2: Cực trị hàm trùng phương",
                    description: "Điều kiện có 1 cực trị hoặc 3 cực trị tạo thành tam giác đặc biệt",
                  },
                ],
              },
              {
                topic_name: "Bài 1.2: Tiệm cận và đồ thị hàm phân thức",
                description: "Tiệm cận đứng, tiệm cận ngang và tiệm cận xiên",
              },
            ],
          },
          {
            topic_name: "Chương 2: Nguyên hàm, Tích phân và Ứng dụng",
            description: "Bảng nguyên hàm cơ bản, phương pháp đổi biến, từng phần và diện tích hình phẳng",
            children: [
              {
                topic_name: "Bài 2.1: Nguyên hàm và các phương pháp tìm nguyên hàm",
                description: "Nguyên hàm từng phần và nguyên hàm đổi biến số",
              },
              {
                topic_name: "Bài 2.2: Ứng dụng tích phân tính diện tích và thể tích",
                description: "Tính diện tích giới hạn bởi các đường cong và vật thể tròn xoay",
              },
            ],
          },
        ],
      },
      {
        subject_name: "Vật Lý THPT",
        description: "Chương trình Vật Lý 12: Dao động cơ, Sóng cơ, Điện xoay chiều và Vật lý hạt nhân",
        chapters: [
          {
            topic_name: "Chương 1: Dao động cơ học",
            description: "Dao động điều hòa, con lắc lò xo, con lắc đơn và tổng hợp dao động",
            children: [
              {
                topic_name: "Bài 1.1: Đại cương về dao động điều hòa",
                description: "Phương trình li độ, vận tốc, gia tốc và đồ thị pha",
              },
              {
                topic_name: "Bài 1.2: Con lắc lò xo và năng lượng dao động",
                description: "Động năng, thế năng và cơ năng trong dao động điều hòa",
              },
            ],
          },
        ],
      },
    ];

    for (const sData of treeData) {
      let subject = await Subject.findOne({ subject_name: sData.subject_name });
      if (!subject) {
        subject = await Subject.create({
          subject_name: sData.subject_name,
          description: sData.description,
        });
        console.log(`➕ Đã tạo môn học: ${subject.subject_name}`);
      } else {
        console.log(`ℹ️ Môn học đã tồn tại: ${subject.subject_name}`);
      }

      for (const ch of sData.chapters) {
        const lv1 = await upsertTopic({
          subject_id: subject._id,
          parent_id: null,
          topic_name: ch.topic_name,
          level: 1,
          description: ch.description,
        });
        console.log(`  ├── [Cấp 1] ${lv1.topic_name}`);

        for (const sub of ch.children || []) {
          const lv2 = await upsertTopic({
            subject_id: subject._id,
            parent_id: lv1._id,
            topic_name: sub.topic_name,
            level: 2,
            description: sub.description,
          });
          console.log(`  │    ├── [Cấp 2] ${lv2.topic_name}`);

          for (const leaf of sub.children || []) {
            const lv3 = await upsertTopic({
              subject_id: subject._id,
              parent_id: lv2._id,
              topic_name: leaf.topic_name,
              level: 3,
              description: leaf.description,
            });
            console.log(`  │    │    └── [Cấp 3] ${lv3.topic_name}`);
          }
        }
      }
    }

    console.log("\n🎉 Hoàn tất khởi tạo cây chủ đề kiến thức mẫu!");
  } catch (err) {
    console.error("❌ Lỗi khi seed cây chủ đề:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seedSubjectsTree();

