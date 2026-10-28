import { connectDB } from "@/lib/db";
import { Topic, Question } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/instructor/topics/[id]
 * Xóa một chuyên đề kèm kiểm tra quyền sở hữu và bảo vệ an toàn câu hỏi
 */
export async function DELETE(request: Request, context: RouteParams) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  try {
    await connectDB();

    const topic = await Topic.findById(id);
    if (!topic) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy chuyên đề để xóa" },
        { status: 404 }
      );
    }

    // Kiểm tra quyền sở hữu: Chỉ người tạo hoặc Admin mới được xóa
    if (
      user?.role !== "admin" &&
      topic.created_by &&
      topic.created_by.toString() !== user?.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền xóa chuyên đề này vì nó được tạo bởi giáo viên khác.",
        },
        { status: 403 }
      );
    }

    // Kiểm tra xem có câu hỏi nào thuộc chuyên đề này không
    const questionCount = await Question.countDocuments({ topic_id: id });
    if (questionCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Không thể xóa chuyên đề "${topic.topic_name}" vì đang chứa ${questionCount} câu hỏi trong ngân hàng. Hãy xóa hoặc chuyển các câu hỏi trước khi xóa chuyên đề để tránh mất tài liệu!`,
        },
        { status: 400 }
      );
    }

    // Xóa các chuyên đề con phụ thuộc (nếu có) và xóa chuyên đề này
    await Topic.deleteMany({ parent_id: id });
    await Topic.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Đã xóa chuyên đề "${topic.topic_name}" thành công!`,
    });
  } catch (error) {
    console.error("Lỗi khi xóa chuyên đề:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi xóa chuyên đề" },
      { status: 500 }
    );
  }
}
