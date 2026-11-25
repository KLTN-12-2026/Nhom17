import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { getStudentAttemptDetail } from "@/lib/practice-history-detail";

/**
 * GET /api/student/practice/history/[id]
 * Xem lại chi tiết một bài làm cũ (hỗ trợ cả Tự luyện và Thi phòng trực tuyến).
 * Chỉ trả đáp án chi tiết của bài thi phòng khi phòng thi đã kết thúc và đề cho phép xem đáp án.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await checkApiAuthorization([
    "student",
    "instructor",
    "admin",
  ]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Mã lượt làm bài không hợp lệ" },
        { status: 400 }
      );
    }

    const attempt = await getStudentAttemptDetail(id, user.id);
    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bài làm này" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      attempt,
    });
  } catch (error) {
    console.error("Lỗi khi tải chi tiết bài làm:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải chi tiết bài làm" },
      { status: 500 }
    );
  }
}
