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

const MONGODB_URI = process.env.MONGODB_URI;

async function cleanMockData() {
  console.log("\n========================================================");
  console.log("🧹 TIẾN HÀNH DỌN DẸP CÂU HỎI MẪU (MOCK QUESTIONS)");
  console.log("========================================================");

  const conn = await mongoose.connect(MONGODB_URI);
  console.log("✅ Kết nối MongoDB thành công!");

  const questionsCollection = conn.connection.db.collection("questions");
  const topicsCollection = conn.connection.db.collection("topics");
  const subjectsCollection = conn.connection.db.collection("subjects");

  const totalBefore = await questionsCollection.countDocuments();
  console.log(`📊 Số câu hỏi hiện tại trong ngân hàng: ${totalBefore} câu.`);

  // 1. Xóa toàn bộ câu hỏi mẫu
  const deleteResult = await questionsCollection.deleteMany({});
  console.log(`✅ Đã xóa thành công: ${deleteResult.deletedCount} câu hỏi mẫu.`);

  // 2. Dọn dẹp chuyên đề tạm "test" nếu có
  const deleteTopicResult = await topicsCollection.deleteMany({ topic_name: /^test$/i });
  if (deleteTopicResult.deletedCount > 0) {
    console.log(`✅ Đã dọn dẹp ${deleteTopicResult.deletedCount} chuyên đề nháp "test".`);
  }

  // 3. Kiểm tra lại dữ liệu sau khi dọn dẹp
  const totalQuestionsAfter = await questionsCollection.countDocuments();
  const totalSubjects = await subjectsCollection.countDocuments();
  const totalTopics = await topicsCollection.countDocuments();

  console.log("\n--------------------------------------------------------");
  console.log("📊 TRẠNG THÁI NGÂN HÀNG DỮ LIỆU HIỆN TẠI:");
  console.log(`- Tổng số câu hỏi: ${totalQuestionsAfter} câu (Sạch sẽ 100%).`);
  console.log(`- Khung môn học được giữ nguyên: ${totalSubjects} môn.`);
  console.log(`- Khung chuyên đề bài học được giữ nguyên: ${totalTopics} chuyên đề.`);

  const remainingSubjects = await subjectsCollection.find({}).toArray();
  for (const sub of remainingSubjects) {
    const subTopics = await topicsCollection.find({ subject_id: sub._id }).toArray();
    console.log(`  📁 Môn [${sub.subject_name}]: ${subTopics.length} chuyên đề.`);
  }

  console.log("--------------------------------------------------------");
  console.log("🎉 Hoàn tất dọn dẹp mock data thành công!\n");

  await mongoose.disconnect();
}

cleanMockData().catch(console.error);
