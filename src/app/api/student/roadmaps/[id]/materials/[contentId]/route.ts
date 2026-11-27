import { readFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { getRoadmapMaterialFilename } from "@/lib/roadmap-files";
import { getRoadmapContents } from "@/lib/roadmaps";
import { LearningProgress, Order, Roadmap } from "@/models";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; contentId: string }>;
};

const materialContentTypes: Record<string, string> = {
  ".csv": "text/csv; charset=utf-8",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function isMissingFile(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

async function readMaterial(filename: string) {
  const privatePath = path.join(process.cwd(), "uploads", "roadmaps", filename);
  try {
    return await readFile(privatePath);
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }

  // Previously uploaded materials were stored in public/uploads/roadmaps.
  return readFile(
    path.join(process.cwd(), "public", "uploads", "roadmaps", filename),
  );
}

export async function GET(request: Request, { params }: RouteContext) {
  const { user, errorResponse } = await checkApiAuthorization(["student"]);
  if (errorResponse) return errorResponse;

  try {
    const { id, contentId } = await params;
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(contentId)
    ) {
      return NextResponse.json(
        { success: false, message: "Tài liệu không hợp lệ." },
        { status: 400 },
      );
    }

    await connectDB();
    const roadmap = await Roadmap.findOne({
      _id: id,
      is_published: true,
    }).lean();
    if (!roadmap) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lộ trình đang xuất bản." },
        { status: 404 },
      );
    }

    const userId = new mongoose.Types.ObjectId(user.id);
    const [progress, completedOrder] = await Promise.all([
      roadmap.price === 0
        ? LearningProgress.exists({
            roadmap_id: roadmap._id,
            user_id: userId,
          })
        : Promise.resolve(null),
      roadmap.price > 0
        ? Order.exists({
            roadmap_id: roadmap._id,
            user_id: userId,
            status: "completed",
          })
        : Promise.resolve(null),
    ]);
    if (
      (roadmap.price === 0 && !progress) ||
      (roadmap.price > 0 && !completedOrder)
    ) {
      return NextResponse.json(
        { success: false, message: "Bạn chưa có quyền truy cập tài liệu này." },
        { status: 403 },
      );
    }

    const content = getRoadmapContents(roadmap).find(
      (item) =>
        String(item._id) === contentId && item.content_type === "lesson",
    );
    const filename = content
      ? getRoadmapMaterialFilename(content.resource_url || "")
      : null;
    if (!content || !filename) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tài liệu trong lộ trình." },
        { status: 404 },
      );
    }

    const file = await readMaterial(filename);
    const extension = path.extname(filename).toLowerCase();
    const downloadName = (content.file_name || filename)
      .replace(/[\r\n]/g, "")
      .replace(/[\\/]/g, "_");
    const asciiFilename = downloadName.replace(/[^\x20-\x7e"]/g, "_");
    const encodedFilename = encodeURIComponent(downloadName).replace(
      /['()*]/g,
      (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    const disposition =
      new URL(request.url).searchParams.get("download") === "1"
        ? "attachment"
        : "inline";

    return new Response(file, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${disposition}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": String(file.byteLength),
        "Content-Type": materialContentTypes[extension] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (isMissingFile(error)) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tệp tài liệu." },
        { status: 404 },
      );
    }
    console.error("Lỗi khi tải tài liệu lộ trình:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải tài liệu." },
      { status: 500 },
    );
  }
}
