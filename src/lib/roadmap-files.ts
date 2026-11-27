import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type RoadmapUploadKind = "cover" | "assessment" | "material";

export class RoadmapUploadError extends Error {}

const extensionSets: Record<RoadmapUploadKind, Set<string>> = {
  cover: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  assessment: new Set([".xlsx", ".xls", ".csv", ".docx", ".txt", ".md"]),
  material: new Set([".pdf", ".docx", ".xlsx", ".xls", ".csv", ".txt", ".md"]),
};

const sizeLimits: Record<RoadmapUploadKind, number> = {
  cover: 5 * 1024 * 1024,
  assessment: 15 * 1024 * 1024,
  material: 20 * 1024 * 1024,
};

const roadmapUploadFilenamePattern =
  /^\/uploads\/roadmaps\/([0-9a-f-]+\.(?:jpg|jpeg|png|webp|xlsx|xls|csv|docx|pdf|txt|md))$/i;

export function getRoadmapUploadFilename(url: string) {
  return roadmapUploadFilenamePattern.exec(url)?.[1] || null;
}

export function getRoadmapMaterialFilename(url: string) {
  const filename = getRoadmapUploadFilename(url);
  if (!filename || !/\.(?:xlsx|xls|csv|docx|pdf|txt|md)$/i.test(filename)) {
    return null;
  }
  return filename;
}

function isValidFileSignature(extension: string, buffer: Buffer) {
  if (extension === ".png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (extension === ".webp") {
    return (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  if (extension === ".pdf") {
    return buffer.toString("ascii", 0, 5) === "%PDF-";
  }
  if ([".xlsx", ".docx"].includes(extension)) {
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  }
  if (extension === ".xls") {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  }
  return true;
}

export async function saveRoadmapFile(file: File, kind: RoadmapUploadKind) {
  if (!file.size) {
    throw new RoadmapUploadError("Tệp tải lên đang trống.");
  }
  if (file.size > sizeLimits[kind]) {
    throw new RoadmapUploadError(
      `Kích thước tệp vượt quá giới hạn ${Math.round(sizeLimits[kind] / 1024 / 1024)} MB.`,
    );
  }
  if (file.name.length > 255) {
    throw new RoadmapUploadError("Tên tệp không được vượt quá 255 ký tự.");
  }

  const extension = path.extname(file.name).toLowerCase();
  if (!extensionSets[kind].has(extension)) {
    throw new RoadmapUploadError(
      kind === "cover"
        ? "Ảnh bìa chỉ hỗ trợ JPG, PNG hoặc WebP."
        : kind === "assessment"
          ? "File câu hỏi chỉ hỗ trợ XLSX, XLS, CSV, DOCX, TXT hoặc MD."
          : "Tài liệu chỉ hỗ trợ PDF, XLSX, XLS, CSV, DOCX, TXT hoặc MD.",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isValidFileSignature(extension, buffer)) {
    throw new RoadmapUploadError("Định dạng nội dung tệp không khớp với phần mở rộng.");
  }

  const uploadDirectory =
    kind === "material"
      ? path.join(process.cwd(), "uploads", "roadmaps")
      : path.join(process.cwd(), "public", "uploads", "roadmaps");
  await mkdir(uploadDirectory, { recursive: true });

  const storedName = `${randomUUID()}${extension}`;
  await writeFile(path.join(uploadDirectory, storedName), buffer, {
    flag: "wx",
  });

  return {
    url: `/uploads/roadmaps/${storedName}`,
    file_name: path.basename(file.name).replace(/[\r\n]/g, ""),
  };
}

export async function deleteRoadmapFile(url: string) {
  const filename = getRoadmapUploadFilename(url);
  if (!filename) {
    throw new RoadmapUploadError("Đường dẫn tệp tải lên không hợp lệ.");
  }

  await unlink(
    path.join(process.cwd(), "public", "uploads", "roadmaps", filename),
  );
}
