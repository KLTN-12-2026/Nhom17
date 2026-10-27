import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: true,
      status: "alive",
      timestamp: Date.now(),
    },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json({ status: "alive" }, { status: 200 });
}
