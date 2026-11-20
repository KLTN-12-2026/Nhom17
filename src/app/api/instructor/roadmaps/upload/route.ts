import { NextResponse } from "next/server";
import { checkApiAuthorization } from "@/lib/auth-guards";
import {
  RoadmapUploadError,
  saveRoadmapFile,
  type RoadmapUploadKind,
} from "@/lib/roadmap-files";

export const runtime = "nodejs";

const uploadKinds = new Set<RoadmapUploadKind>(["cover", "material"]);

export async function POST(request: Request) {
  const { errorResponse } = await checkApiAuthorization([
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");
    if (!(file instanceof File) || typeof kind !== "string" || !uploadKinds.has(kind as RoadmapUploadKind)) {
      return NextResponse.json(
        { success: false, message: "Tệp tải lên hoặc loại tệp không hợp lệ." },
        { status: 400 },
      );
    }

    const uploaded = await saveRoadmapFile(file, kind as RoadmapUploadKind);
    return NextResponse.json({ success: true, ...uploaded });
  } catch (error) {
    if (error instanceof RoadmapUploadError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }
    console.error("Lỗi khi tải tệp lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải tệp lên." },
      { status: 500 },
    );
  }
}
