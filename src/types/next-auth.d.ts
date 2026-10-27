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
