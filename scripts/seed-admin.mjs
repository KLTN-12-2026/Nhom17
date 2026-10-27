import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Đọc file .env.local thủ công nếu có
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

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    role: { type: String, enum: ["admin", "instructor", "student"], default: "student" },
    status: { type: String, default: "active" },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function seedAdmin() {
  const adminEmail = process.argv[2] || "admin@dtu.edu.vn";
  const adminPassword = process.argv[3] || "Admin@123456";
  const adminName = process.argv[4] || "Administrator ĐH Duy Tân";

  console.log(`\n========================================`);
  console.log(`🚀 KHỞI TẠO TÀI KHOẢN ADMIN MẪU`);
  console.log(`========================================`);
  console.log(`- Database URI: ${MONGODB_URI}`);
  console.log(`- Email Admin: ${adminEmail}`);
  console.log(`- Mật khẩu: ${adminPassword}`);
  console.log(`- Họ và tên: ${adminName}\n`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Kết nối MongoDB thành công!");

    let existing = await User.findOne({ email: adminEmail });

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    if (existing) {
      existing.role = "admin";
      existing.status = "active";
      existing.is_active = true;
      existing.password = hashedPassword;
      await existing.save();
      console.log(`\n🎉 ĐÃ CẬP NHẬT TÀI KHOẢN THÀNH ADMIN THÀNH CÔNG!`);
      console.log(`👉 Bạn có thể đăng nhập ngay tại: http://localhost:3000/auth/login`);
    } else {
      const newAdmin = await User.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        status: "active",
        is_active: true,
      });
      console.log(`\n🎉 TẠO MỚI TÀI KHOẢN ADMIN THÀNH CÔNG!`);
      console.log(`👉 ID: ${newAdmin._id}`);
      console.log(`👉 Email: ${adminEmail}`);
      console.log(`👉 Password: ${adminPassword}`);
      console.log(`👉 Hãy đăng nhập tại: http://localhost:3000/auth/login`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi khởi tạo Admin:", error);
    process.exit(1);
  }
}

seedAdmin();
