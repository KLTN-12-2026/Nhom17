//src\app\api\extension\jobs\next\route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      jobs: [],
    },
    { status: 200 },
  );
}

export async function POST() {
  return NextResponse.json({ success: true }, { status: 200 });
}
