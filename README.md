//README.md

# NỀN TẢNG LUYỆN THI TRẮC NGHIỆM TRỰC TUYẾN TÍCH HỢP AI

### Khóa Luận Tốt Nghiệp Đại Học (12-2026) • Nhóm 17 • Trường Đại Học Duy Tân

![Next.js](https://img.shields.io/badge/Next.js-16.3.6-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-9.10-47A248?style=for-the-badge&logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![NextAuth](https://img.shields.io/badge/NextAuth.js-v4-purple?style=for-the-badge)

---

## 📖 1. GIỚI THIỆU ĐỀ TÀI

Hệ thống **Quản lý & Tổ chức Thi Trắc nghiệm Trực tuyến Tích hợp Trí tuệ Nhân tạo (AI)** là nền tảng kiểm tra, đánh giá và luyện thi thông minh. Dự án áp dụng công nghệ AI để tự động sinh câu hỏi từ tài liệu học tập, phát hiện hành vi gian lận thi cử qua Camera thời gian thực, đồng thời phân tích lỗ hổng kiến thức để đề xuất lộ trình ôn tập cá nhân hóa cho học viên.

- **Giảng viên hướng dẫn**: ThS. Ngô Văn Hiếu & ThS. Phan Long
- **Đơn vị đào tạo**: Khoa Công nghệ Thông tin — Trường Đại học Duy Tân (DTU)
- **Đơn vị thực hiện**: Nhóm 17 (KLTN 12-2026)

---

## ⚡ 2. CÔNG NGHỆ CHỦ CHỐT (TECH STACK)

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, Responsive Glassmorphism Design.
- **Backend**: Next.js Server Components, API Route Handlers, Edge Proxy Middleware.
- **Database (NoSQL)**: MongoDB Atlas, Mongoose ODM 9 (Áp dụng kỹ thuật Embedding Subdocuments & Snapshot Pattern).
- **Authentication**: NextAuth.js v4 (Hỗ trợ Credentials Login, Google OAuth 2.0 Social Login, SHA-256 OTP Password Reset).
- **AI Engine**: Google Gemini 1.5 API & OpenAI API (Sinh câu hỏi tự động, chấm thi tự luận ngắn, phân tích điểm yếu học viên).
- **Real-time Engine**: Socket.IO (Phòng thi trực tuyến đồng bộ thời gian thực).
- **Quality Assurance**: TypeScript strict mode, ESLint 9, GitHub Actions Automated CI/CD.

---

## 🏛️ 3. KIẾN TRÚC CƠ SỞ DỮ LIỆU (11 MODELS / 5 PHÂN HỆ)

Hệ thống tối ưu hóa từ **Sơ đồ ERD 19 bảng quan hệ** thành **11 Collections MongoDB** có cấu trúc nhúng (Embedded Documents) hiệu năng cao:

1. **🔷 Phân Hệ 1: Người Dùng & Tài Khoản**
   - `User.ts`: Quản lý tài khoản, phân quyền RBAC (`student`, `instructor`, `admin`), ẩn mật khẩu mặc định (`select: false`).
   - `PasswordResetToken.ts`: Quản lý mã OTP khôi phục mật khẩu với **TTL Index** tự động hủy sau 20 phút.
2. **🔷 Phân Hệ 2: Ngân Hàng Câu Hỏi & Tri Thức**
   - `Subject.ts`: Danh mục môn học trong trường.
   - `Topic.ts`: Cây chủ đề tri thức phân cấp cha - con vô tận tầng (`parent_id` Self-reference).
   - `Question.ts`: Ngân hàng câu hỏi hỗ trợ công thức toán học LaTeX, nhúng mảng phương án trả lời `options` (`DapAn`).
3. **🔷 Phân Hệ 3: Đề Thi & Phòng Thi Trực Tiếp**
   - `Exam.ts`: Quản lý đề thi, xáo đề, đảo đáp án, áp dụng **Snapshot Pattern** bảo lưu đề thi và hook tự động tính điểm `pre("validate")`.
   - `ExamRoom.ts`: Điều phối phòng thi Live Socket.IO, nhúng danh sách và trạng thái kết nối mạng của thí sinh.
4. **🔷 Phân Hệ 4: Làm Bài, Giám Sát AI & Đánh Giá**
   - `ExamAttempt.ts`: Document trung tâm gom 4 bảng (`BaiThiHocVien`, `ChiTietTraLoi`, `GiamSatGianLan`, `PhanTichAI`). Nộp bài thi nguyên tử chỉ trong 1 thao tác ghi.
5. **🔷 Phân Hệ 5: Lộ Trình Học Tập & Doanh Thu**
   - `Roadmap.ts`: Khóa học luyện thi nhiều chặng, nhúng 2 tầng (`stages` ➔ `contents`).
   - `LearningProgress.ts`: Theo dõi tỷ lệ % hoàn thành từng khóa học của học sinh với Compound Unique Index.
   - `Order.ts`: Sổ cái giao dịch thanh toán MoMo, VNPay, không áp dụng xóa vật lý.

---

## 🔐 4. PHÂN QUYỀN TRUY CẬP (ROLE-BASED ACCESS CONTROL - RBAC)

Hệ thống được bảo vệ nghiêm ngặt qua 3 lớp:

- **Lớp 1 (Edge Middleware)**: Chặn đứng URL trái phép, tự động đẩy về `/unauthorized` (403 Forbidden).
- **Lớp 2 (API Guards)**: Hàm kiểm tra quyền `checkApiAuthorization()` bảo vệ backend API.
- **Lớp 3 (Dynamic Dashboard)**: Giao diện và thanh Sidebar tự động thay đổi theo vai trò:
  - 👑 **Quản trị viên (`/admin`)**: Quản lý người dùng, duyệt đề thi, theo dõi sổ cái doanh thu.
  - 👨‍🏫 **Giảng viên (`/instructor`)**: Quản lý câu hỏi AI, tổ chức đề thi, mở phòng thi Live.
  - 🎓 **Học viên (`/student`)**: Vào phòng thi thời gian thực, luyện tập trắc nghiệm, nhận xét điểm yếu từ AI.

---

## 📂 5. CẤU TRÚC THƯ MỤC DỰ ÁN (DIRECTORY STRUCTURE)

```text
ai-quiz-app/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI tự động kiểm tra Lint & Build
├── docs/                      # Tài liệu kỹ thuật chi tiết phục vụ bảo vệ đồ án
│   ├── GIT_WORKFLOW.md        # Hướng dẫn quy chuẩn Git & Pull Request làm việc nhóm
│   ├── HUONG_DAN_AUTH_NEXTJS.md  # Chi tiết xác thực NextAuth & Google OAuth
│   ├── HUONG_DAN_PHAN_QUYEN_RBAC.md # Kiến trúc bảo mật 3 lớp & Ma trận phân quyền
│   └── KIEN_TRUC_CSDL_MONGODB.md # Luận điểm bảo vệ & Chi tiết 11 Models MongoDB
├── public/                    # Tài nguyên tĩnh (ảnh, favicon, icon)
├── scripts/
│   └── seed-admin.mjs         # Script tạo tài khoản Admin quản trị mẫu
├── src/
│   ├── app/                   # Next.js 16 App Router
│   │   ├── admin/             # Dashboard dành cho Quản trị viên
│   │   ├── instructor/        # Dashboard dành cho Giảng viên
│   │   ├── student/           # Dashboard dành cho Học sinh
│   │   ├── dashboard/         # Bộ điều hướng thông minh sau đăng nhập
│   │   ├── unauthorized/      # Trang báo lỗi 403 Forbidden
│   │   ├── auth/              # Các trang Login, Register, Forgot Password
│   │   └── api/               # Backend API Endpoints & Auth Handlers
│   ├── components/            # React Components module hóa
│   │   ├── auth/              # Giao diện Form đăng nhập, đăng ký, đăng xuất
│   │   └── dashboard/         # Sidebar động và Shell bọc Dashboard RBAC
│   ├── lib/                   # Thư viện tiện ích dùng chung
│   │   ├── db.ts              # Kết nối MongoDB với cơ chế Connection Caching
│   │   ├── auth-guards.ts     # Helpers kiểm tra vai trò cho API & Server Components
│   │   ├── email.ts           # Dịch vụ gửi email OTP qua Nodemailer
│   │   └── validations/       # Schema xác thực dữ liệu đầu vào bằng Zod
│   ├── models/                # 11 Mongoose Schemas & TypeScript Interfaces
│   │   ├── User.ts, Question.ts, Exam.ts, ExamAttempt.ts ...
│   │   └── index.ts           # Barrel Export tập trung
│   ├── types/                 # Type declaration cho NextAuth Session & JWT
│   └── middleware.ts          # Edge Proxy Middleware bảo vệ an ninh định tuyến
├── .env.example               # Mẫu biến môi trường an toàn khi clone dự án
├── package.json               # Cấu hình dependencies và lệnh thực thi
└── tsconfig.json              # Cấu hình TypeScript Strict Mode
```

---

## 🚀 6. HƯỚNG DẪN CÀI ĐẶT & CHẠY LOCAL (GETTING STARTED)

### 1. Yêu cầu tiên quyết

- Node.js v20+ hoặc v22+
- Cơ sở dữ liệu MongoDB (Local MongoDB hoặc MongoDB Atlas URI)

### 2. Cài đặt các gói phụ thuộc

```bash
npm install
```

### 3. Cấu hình Biến môi trường

Sao chép file `.env.example` thành `.env.local` và điền các thông số kết nối:

```bash
cp .env.example .env.local
```

### 4. Khởi tạo tài khoản Quản trị viên (Admin)

Chạy script tự động tạo tài khoản Admin mẫu để kiểm thử phân quyền:

```bash
npm run seed:admin
```

- **Email đăng nhập**: `admin@dtu.edu.vn`
- **Mật khẩu**: `Admin@123456`
- **Quyền hạn**: `admin`

### 5. Khởi động môi trường phát triển

```bash
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) để trải nghiệm ứng dụng.

---

## 🧪 7. LỆNH KIỂM CHUẨN MÃ NGUỒN (CODE QUALITY CHECK)

Trước khi mở Pull Request lên GitHub, nhóm luôn thực hiện kiểm tra tự động:

```bash
# 1. Kiểm tra toàn vẹn kiểu dữ liệu TypeScript
npx tsc --noEmit

# 2. Kiểm tra quy chuẩn cú pháp ESLint
npm run lint

# 3. Biên dịch bản dựng sản phẩm Production
npm run build
```

---

_© 2026 Nhóm 17 • Khoa Công nghệ Thông tin • Trường Đại học Duy Tân. Mọi quyền được bảo lưu._
