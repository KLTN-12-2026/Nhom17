import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";

function loadLocalEnv() {
  const envFile = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("Thiếu MONGODB_URI. Hãy cấu hình .env.local trước khi seed.");
  process.exit(1);
}

const ObjectId = mongoose.Schema.Types.ObjectId;
const UserSchema = new mongoose.Schema({ role: String, status: String, is_active: Boolean }, { strict: false });
const ContentSchema = new mongoose.Schema({
  content_type: { type: String, enum: ["exam", "practice", "lesson"], required: true },
  exam_id: { type: ObjectId, ref: "Exam", default: null },
  title: { type: String, required: true },
  order: { type: Number, required: true },
});
const StageSchema = new mongoose.Schema({
  stage_title: { type: String, required: true },
  order: { type: Number, required: true },
  description: { type: String, default: "" },
  contents: { type: [ContentSchema], default: [] },
});
const RoadmapSchema = new mongoose.Schema({
  teacher_id: { type: ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  price: { type: Number, min: 0, default: 0 },
  cover_image: { type: String, default: "" },
  is_published: { type: Boolean, default: false },
  stages: { type: [StageSchema], default: [] },
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Roadmap = mongoose.models.Roadmap || mongoose.model("Roadmap", RoadmapSchema);

async function seedPaidRoadmap() {
  try {
    await mongoose.connect(mongoUri);
    const owner = await User.findOne({
      role: { $in: ["admin", "instructor"] },
      status: "active",
      is_active: true,
    }).select("_id").lean();

    if (!owner) {
      throw new Error("Cần có tài khoản admin hoặc instructor đang hoạt động trước. Hãy chạy npm run seed:admin hoặc đăng ký giảng viên rồi thử lại.");
    }

    const title = "Chinh Phục Kì Thi THPT - Lộ Trình Nâng Cao";
    const roadmap = await Roadmap.findOneAndUpdate(
      { title },
      {
        $set: {
          teacher_id: owner._id,
          description: "Lộ trình trả phí mẫu để kiểm thử quy trình tạo đơn, thanh toán mô phỏng và theo dõi tiến độ ôn thi THPT.",
          price: 199000,
          is_published: true,
        },
        $setOnInsert: {
          cover_image: "",
          stages: [
            {
              stage_title: "Củng cố nền tảng",
              order: 1,
              description: "Ôn lại kiến thức cốt lõi trước khi luyện đề.",
              contents: [
                { content_type: "lesson", title: "Ôn tập kiến thức trọng tâm", order: 1 },
                { content_type: "practice", title: "Bài luyện tập nền tảng", order: 2 },
              ],
            },
            {
              stage_title: "Luyện tập theo chuyên đề",
              order: 2,
              description: "Rèn kỹ năng xử lý những dạng thường gặp trong đề thi.",
              contents: [
                { content_type: "practice", title: "Luyện tập chuyên đề nâng cao", order: 1 },
              ],
            },
            {
              stage_title: "Tổng ôn và đánh giá",
              order: 3,
              description: "Tổng hợp kiến thức và tự đánh giá mức độ sẵn sàng.",
              contents: [
                { content_type: "exam", title: "Đề tổng ôn thử sức", order: 1 },
              ],
            },
          ],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );

    console.log("Đã tạo/cập nhật lộ trình có phí:");
    console.log(`- ${roadmap.title}`);
    console.log(`- Giá: ${new Intl.NumberFormat("vi-VN").format(roadmap.price)} ₫`);
    console.log(`- ID: ${roadmap._id}`);
    console.log("- Trạng thái: đã xuất bản");
    console.log("Mở /student/roadmaps bằng tài khoản học viên để thử mua.");
  } catch (error) {
    console.error("Seed lộ trình có phí thất bại:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void seedPaidRoadmap();
