import { connectDB } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const data = loginSchema.parse(credentials);
        await connectDB();
        const user = await User.findOne({ email: data.email }).select("+password");

        if (!user || user.status === "disabled" || user.is_active === false) {
          return null;
        }

        const isValid = await bcrypt.compare(data.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/auth/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        await connectDB();
        const existingUser = await User.findOne({ email: user.email });
        if (!existingUser) {
          // Tự động tạo tài khoản Học viên khi đăng nhập Google lần đầu
          await User.create({
            name: user.name || "Google User",
            email: user.email,
            avatar_url: user.image || "",
            role: "student",
            status: "active",
            is_active: true,
          });
        } else if (user.image && !existingUser.avatar_url) {
          existingUser.avatar_url = user.image;
          await existingUser.save();
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email }).select("_id");
          if (dbUser) {
            token.id = dbUser._id.toString();
          }
        } else {
          token.id = user.id;
          token.role = user.role;
        }
      }

      if (token.id) {
        await connectDB();
        const dbUser = await User.findById(token.id).select(
          "name email role avatar_url"
        );
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.role = dbUser.role;
          if (dbUser.avatar_url) {
            token.picture = dbUser.avatar_url;
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? null;
        session.user.image = token.picture ?? null;
        session.user.role = token.role as "admin" | "instructor" | "student";
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };