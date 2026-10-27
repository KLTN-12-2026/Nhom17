import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(
      {
        success: true,
        message: "Device registered successfully",
        data: body,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ready" });
}
