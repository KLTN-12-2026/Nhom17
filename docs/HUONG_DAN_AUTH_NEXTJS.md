//docs\HUONG_DAN_AUTH_NEXTJS.md

# Hướng Dẫn Chi Tiết Hệ Thống Xác Thực (Auth) Với Next.js & MongoDB

Tài liệu này tổng hợp toàn bộ quy trình xây dựng, luồng hoạt động và các giải pháp xử lý lỗi thực tế cho 2 màn hình **Đăng nhập (Login)** và **Đăng ký (Register)** trong dự án **Nền tảng Luyện thi Trắc nghiệm Tích hợp AI**.

> **Công nghệ sử dụng trong dự án:**
>
> - **Framework**: Next.js (App Router) + TypeScript + React 19 + Tailwind CSS
> - **Database / ORM**: MongoDB + Mongoose (Mô hình 11 Collections tối ưu)
> - **Xác thực (Auth)**: NextAuth.js (`next-auth`) với Credentials Provider & JWT Strategy
> - **Bảo mật**: `bcryptjs` (salt 12 để mã hóa mật khẩu)
> - **Validate dữ liệu**: `zod`

---

## 1. Cấu Trúc Thư Mục Thực Tế Trong Dự Án

Hệ thống đặt các trang xác thực trong nhóm route `/auth/`:

```text
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/
│   │       │   └── route.ts         # Cấu hình NextAuth (Credentials, Callbacks, Pages)
│   │       ├── register/
│   │       │   └── route.ts         # API đăng ký tài khoản (Bắt lỗi Zod, hash bcrypt)
│   │       ├── forgot-password/     # API gửi email đặt lại mật khẩu OTP
│   │       └── reset-password/      # API đặt lại mật khẩu mới
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx             # Trang Đăng nhập (/auth/login) - bọc Suspense
│   │   ├── register/
│   │   │   └── page.tsx             # Trang Đăng ký (/auth/register)
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   └── dashboard/
│       └── page.tsx                 # Trang chính sau đăng nhập (Bảo vệ bởi getServerSession)
├── components/
│   └── auth/
│       ├── auth-shell.tsx           # Khung giao diện 2 cột chia đôi
│       ├── login-form.tsx           # Biểu mẫu đăng nhập (toggle pass, nhận ?registered=true)
│       ├── register-form.tsx        # Biểu mẫu đăng ký (chọn vai trò Student/Instructor)
│       └── logout-button.tsx        # Nút đăng xuất signOut()
├── lib/
│   ├── db.ts                        # Kết nối MongoDB có cache chống duplicate connection
│   └── validations/
│       └── auth.ts                  # Zod Schemas validate dữ liệu đầu vào
├── models/
│   ├── User.ts                      # Model NguoiDung (vai trò, trạng thái, select: false)
│   └── index.ts                     # Xuất 11 models của hệ thống
└── types/
    └── next-auth.d.ts               # Khai báo type mở rộng id và role cho Session & JWT
```

---

## 2. Luồng Dữ Liệu Tổng Quát

```text
       [ NGƯỜI DÙNG NHẬP FORM ]
                 │
                 ├── (Đăng ký) ───────────────────────────────────────────┐
                 │                                                        │
                 ▼                                                        ▼
         [ RegisterForm ]                                          [ LoginForm ]
                 │                                                        │
                 ▼ (Fetch POST)                                           ▼ (signIn "credentials")
       /api/auth/register                                       NextAuth authorize()
                 │                                                        │
                 ▼                                                        ▼
      Validate bằng Zod Schema                                 Validate bằng Zod Schema
                 │                                                        │
                 ▼                                                        ▼
      Kiểm tra email trùng lặp                                  Tìm User trong MongoDB
                 │                                               (User.findOne +password)
                 ▼                                                        │
       Hash mật khẩu (bcrypt, 12)                                         ▼
                 │                                              So sánh bcrypt.compare()
                 ▼                                                        │
         Tạo User mới vào DB                                              ▼
                 │                                              Tạo JWT & Session Token
                 ▼                                              (Kích hoạt callbacks)
      Trả kết quả & chuyển hướng:                                         │
     /auth/login?registered=true                                          ▼
                                                                Chuyển hướng /dashboard
```

---

## 3. Chi Tiết Từng Thành Phần Đã Triển Khai

### 3.1. Model Người Dùng ([`src/models/User.ts`](file:///d:/Trắc_nghiệmAI/Nhom17/src/models/User.ts))

- Mật khẩu có thuộc tính `select: false` để khi query thông tin người dùng hiển thị lên web không bao giờ vô tình để lộ hash mật khẩu.
- Hỗ trợ 3 vai trò: `student` (Học viên), `instructor` (Giáo viên), `admin` (Quản trị viên).
- Quản lý trạng thái bằng cả `status` (`active` | `disabled`) và `is_active` (`true` | `false`).

```typescript
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    phone_number: { type: String, trim: true, default: "" },
    avatar_url: { type: String, trim: true, default: "" },
    role: {
      type: String,
      enum: ["admin", "instructor", "student"],
      default: "student",
    },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
```

---

### 3.2. Định Nghĩa Validation Bằng Zod ([`src/lib/validations/auth.ts`](file:///d:/Trắc_nghiệmAI/Nhom17/src/lib/validations/auth.ts))

Validate dữ liệu chuẩn mực trước khi xử lý logic:

```typescript
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Họ và tên phải có ít nhất 2 ký tự"),
  email: z.string().trim().email("Email không đúng định dạng").toLowerCase(),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
  role: z.enum(["student", "instructor"]),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Email không đúng định dạng").toLowerCase(),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
```

---

### 3.3. API Đăng Ký ([`src/app/api/auth/register/route.ts`](file:///d:/Trắc_nghiệmAI/Nhom17/src/app/api/auth/register/route.ts))

**Điểm mấu chốt đã tối ưu:**

1. **Bắt lỗi Zod chính xác**: Nếu mật khẩu < 8 ký tự hoặc tên quá ngắn, khối `catch (error)` kiểm tra `error instanceof z.ZodError` và trả về thông báo cụ thể từ Zod thay vì báo lỗi chung chung.
2. **Kiểm tra trùng Email**: Trả về HTTP 409 nếu email đã có tài khoản.
3. **Mã hóa bcrypt an toàn**: Sử dụng `salt: 12` trước khi lưu vào MongoDB.

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    await connectDB();

    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return NextResponse.json(
        { message: "Email này đã được sử dụng. Vui lòng chọn email khác." },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    await User.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
      status: "active",
      is_active: true,
    });

    return NextResponse.json(
      { message: "Đăng ký tài khoản thành công!" },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { message: "Đã xảy ra lỗi khi tạo tài khoản. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}
```

---

### 3.4. Cấu Hình NextAuth ([`src/app/api/auth/[...nextauth]/route.ts`](file:///d:/Trắc_nghiệmAI/Nhom17/src/app/api/auth/[...nextauth]/route.ts))

**3 Cấu hình bắt buộc để hệ thống không bị lỗi:**

1. **`pages.signIn: "/auth/login"`**: Định tuyến NextAuth chuyển hướng lỗi về trang đăng nhập của dự án thay vì trang mặc định `/api/auth/signin`.
2. **`callbacks.jwt` & `callbacks.session`**: Bắt buộc phải có để chuyển `user.id` và `user.role` từ `authorize()` vào JWT Token và gán vào `session.user`. Nếu thiếu, `session.user.role` sẽ luôn bị `undefined`.
3. **Kiểm tra tài khoản hoạt động**: Chặn đăng nhập nếu `status === "disabled"` hoặc `is_active === false`.

```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const data = loginSchema.parse(credentials);
        await connectDB();

        // Thêm select("+password") vì User model đang ẩn trường password
        const user = await User.findOne({ email: data.email }).select(
          "+password",
        );

        if (!user || user.status === "disabled" || user.is_active === false) {
          return null;
        }

        const isValid = await bcrypt.compare(data.password, user.password);
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/auth/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "instructor" | "student";
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
```

---

### 3.5. File Khai Báo TypeScript Cho NextAuth ([`src/types/next-auth.d.ts`](file:///d:/Trắc_nghiệmAI/Nhom17/src/types/next-auth.d.ts))

Để TypeScript tự động nhận diện `session.user.role` và `session.user.id` mà không cần ép kiểu `as any`:

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "instructor" | "student";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "admin" | "instructor" | "student";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "admin" | "instructor" | "student";
  }
}
```

---

### 3.6. Tích Hợp Đăng Nhập / Đăng Ký Bằng Google (OAuth 2.0)

Hệ thống đã được tích hợp sẵn **`GoogleProvider`** trong NextAuth:

1. **Tự động đăng ký**: Khi học viên bấm _Đăng nhập bằng Google_ lần đầu tiên, hệ thống sẽ tự động tạo một tài khoản `User` trong MongoDB với `name`, `email`, `avatar_url` lấy từ Google (vai trò mặc định `student`). Mật khẩu được để trống (`required: false`).
2. **Tự động đăng nhập**: Những lần đăng nhập sau, NextAuth sẽ tìm User theo email và cấp JWT session với đầy đủ `user.id` và `user.role`.

#### Cách lấy Google Client ID & Secret để kích hoạt:

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/) và tạo một dự án mới (ví dụ: `AI-Quiz`).
2. Vào mục **APIs & Services** ➔ **OAuth consent screen** ➔ Chọn User Type là **External** ➔ Điền tên ứng dụng và email hỗ trợ.
3. Vào mục **Credentials** ➔ Bấm **Create Credentials** ➔ Chọn **OAuth client ID**:
   - Application type: **Web application**
   - Name: `AI Quiz Web`
   - **Authorized redirect URIs** (Bắt buộc): `http://localhost:3000/api/auth/callback/google`
4. Copy 2 mã nhận được và dán vào file `.env.local`:
   ```env
   GOOGLE_CLIENT_ID="mã_client_id_của_bạn.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="mã_client_secret_của_bạn"
   ```
5. Khi 2 biến môi trường này được điền, nút **"Đăng nhập bằng Google"** trên giao diện sẽ kích hoạt popup chọn tài khoản Gmail thật ngay lập tức!

---

### 3.7. Giao Diện Form Đăng Ký ([`src/components/auth/register-form.tsx`](file:///d:/Trắc_nghiệmAI/Nhom17/src/components/auth/register-form.tsx))

- **Giao diện chuẩn tiếng Anh quốc tế**: Toàn bộ nhãn, placeholder và thông báo chuyển sang tiếng Anh chuyên nghiệp.
- **Tích hợp nút Google OAuth**: Bấm _"Sign up with Google (Student)"_ để tạo nhanh tài khoản học viên mà không cần nhập form.
- **Bộ chọn vai trò linh hoạt**: Chọn giữa **Student** (Học viên) hoặc **Instructor** (Giáo viên) với hiệu ứng active trực quan.
- **Nút Ẩn / Hiện mật khẩu**: Có nút toggle _"Show / Hide"_ mật khẩu và kiểm tra độ dài tối thiểu 8 ký tự ngay tại Client.
- **Chuyển trang SPA**: Dùng `<Link href="/auth/login">` từ `next/link`.
- Khi đăng ký thành công, tự động chuyển sau 1.2s: `router.push("/auth/login?registered=true")`.

---

### 3.8. Giao Diện Form Đăng Nhập ([`src/components/auth/login-form.tsx`](file:///d:/Trắc_nghiệmAI/Nhom17/src/components/auth/login-form.tsx))

- **Giao diện chuẩn tiếng Anh quốc tế**: Tiêu đề _"Sign in to your account"_, phụ đề và các nút bấm đồng bộ tiếng Anh.
- **Tích hợp nút Google OAuth**: Nút _"Continue with Google"_ nằm trên cùng kèm đường phân cách _"Or continue with email"_.
- **Bắt tham số URL `registered=true`**: Nếu vừa đăng ký xong, tự động hiển thị banner thông báo xanh: _"Registration successful! Please sign in with your account."_
- Hỗ trợ nút **Ẩn / Hiện mật khẩu (Show / Hide)** và link _"Forgot password?"_.
- Gọi hàm `signIn("credentials", { email, password, redirect: false })`.
- Trang cha [`src/app/auth/login/page.tsx`](file:///d:/Trắc_nghiệmAI/Nhom17/src/app/auth/login/page.tsx) được bọc trong `<Suspense fallback={<div>Loading form...</div>}>`.

---

### 3.9. Bảo Vệ Trang Dashboard ([`src/app/dashboard/page.tsx`](file:///d:/Trắc_nghiệmAI/Nhom17/src/app/dashboard/page.tsx))

Tại Server Component, gọi `getServerSession` để kiểm tra phiên đăng nhập. Nếu chưa đăng nhập, chuyển hướng chính xác về `/auth/login`:

```typescript
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardContent from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login"); // Đã sửa từ /login thành /auth/login
  }

  return <DashboardContent user={session.user} />;
}
```

---

## 4. Các "Cạm Bẫy" Kinh Điển & Cách Khắc Phục

| Vấn đề gặp phải                                 | Nguyên nhân                                                                             | Cách khắc phục triệt để                                                                                                        |
| :---------------------------------------------- | :-------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **Lỗi 404 khi chưa login mà vào Dashboard**     | Code gọi `redirect("/login")` trong khi thư mục trang là `src/app/auth/login/page.tsx`. | Đổi toàn bộ đường dẫn redirect sang `/auth/login`.                                                                             |
| **`session.user.role` bị `undefined`**          | NextAuth mặc định không lưu các trường tùy biến ngoài `name` và `email`.                | Bắt buộc khai báo 2 hàm `jwt` và `session` trong phần `callbacks` của `authOptions`.                                           |
| **Lỗi tạo User khi đăng nhập Google**           | Model `User` để `password: { required: true }`, trong khi Google không trả mật khẩu.    | Đổi thành `password: { required: false }` trong [`src/models/User.ts`](file:///d:/Trắc_nghiệmAI/Nhom17/src/models/User.ts).    |
| **API Đăng ký không hiển thị lỗi Zod**          | Khối `catch` không phân loại lỗi, nuốt mất message của `ZodError`.                      | Dùng `if (error instanceof z.ZodError)` lấy `error.issues[0]?.message`.                                                        |
| **Terminal bị spam log 404 liên tục**           | Tiện ích (Extension) trình duyệt ping ngầm `/devices/heartbeat` & `/jobs/next`.         | Tạo sẵn 2 route API rỗng trả về `200 OK` để dứt điểm log đỏ.                                                                   |
| **Lỗi ESLint `set-state-in-effect` (React 19)** | Gọi `setState` trực tiếp bên trong `useEffect` khi đọc `searchParams`.                  | Tính toán trực tiếp giá trị biến từ `searchParams` trong lúc render (`const isRegistered = searchParams.get(...) === "true"`). |
| **Bấm chuyển trang bị giật reload toàn bộ**     | Dùng thẻ HTML thuần `<a href="...">`.                                                   | Luôn dùng `<Link href="...">` từ `next/link`.                                                                                  |
| **Build error do `useSearchParams`**            | Dùng hook `useSearchParams` trong App Router mà không bọc `<Suspense>`.                 | Bọc component form trong thẻ `<Suspense fallback={...}>` ở file `page.tsx`.                                                    |

---

## 5. Quy Trình Kiểm Thử Hoạt Động (Testing Checklist)

1. **Test Đăng Ký Lỗi**:
   - Nhập họ tên 1 ký tự ➔ Báo lỗi: _"Họ và tên phải có ít nhất 2 ký tự"_.
   - Nhập mật khẩu 5 ký tự ➔ Báo lỗi: _"Mật khẩu phải có độ dài tối thiểu 8 ký tự"_.
2. **Test Đăng Ký Thành Công**:
   - Nhập đầy đủ thông tin hợp lệ ➔ Báo xanh _"Đăng ký tài khoản thành công!"_ ➔ Tự chuyển sang `/auth/login?registered=true`.
3. **Test Giao Diện Đăng Nhập**:
   - Trang đăng nhập hiển thị banner thông báo xanh: _"Đăng ký tài khoản thành công! Vui lòng nhập thông tin để đăng nhập."_
4. **Test Đăng Nhập Sai Mật Khẩu**:
   - Nhập sai mật khẩu ➔ Hiển thị thông báo đỏ: _"Email hoặc mật khẩu không chính xác"_.
5. **Test Đăng Nhập Bằng Google (1-Click OAuth)**:
   - Bấm nút **"Đăng nhập nhanh với Google"** ➔ Mở popup đăng nhập Gmail ➔ Chọn tài khoản ➔ Vào thẳng `/dashboard` và tự tạo `User` học viên trong DB nếu là lần đầu.
6. **Test Đăng Nhập Đúng**:
   - Đăng nhập thành công ➔ Chuyển hướng ngay lập tức đến `/dashboard` và hiển thị thông tin học viên/giáo viên.
7. **Test Bảo Vệ Route**:
   - Mở cửa sổ ẩn danh (chưa đăng nhập), truy cập trực tiếp `http://localhost:3000/dashboard` ➔ Tự động chuyển hướng về `http://localhost:3000/auth/login`.
