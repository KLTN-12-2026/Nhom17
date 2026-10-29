//src\app\api\auth\register\route.ts
import { connectDB } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    await connectDB();

    if (data.role === "instructor") {
      const validKey = process.env.INSTRUCTOR_SECRET_KEY || "INSTRUCTOR-KEY-2026";
      const providedKey = (data.teacherSecretCode ?? "").trim().toUpperCase();
      if (!providedKey || providedKey !== validKey.toUpperCase()) {
        return NextResponse.json(
          {
            message:
              "Invalid Instructor Verification Key. Please enter the valid institutional key provided by your academic administration.",
          },
          { status: 400 },
        );
      }
    }

    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return NextResponse.json(
        {
          message: "This email is already in use. Please choose another email.",
        },
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
      { message: "Account registered successfully!" },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid form data" },
        { status: 400 },
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      {
        message:
          "An error occurred while creating your account. Please try again later.",
      },
      { status: 500 },
    );
  }
}
