import { connectDB } from "@/lib/db";
import { Subject, Topic, Question } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/instructor/subjects/[id]
 * Xóa một môn học kèm kiểm tra quyền sở hữu và bảo vệ an toàn dữ liệu câu hỏi
 */
export async function DELETE(request: Request, context: RouteParams) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  try {
    await connectDB();

    const subject = await Subject.findById(id);
    if (!subject) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy môn học để xóa" },
        { status: 404 }
      );
    }

    // Kiểm tra quyền sở hữu: Chỉ người tạo hoặc Admin mới được xóa
    if (
      user?.role !== "admin" &&
      subject.created_by &&
      subject.created_by.toString() !== user?.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền xóa môn học này vì nó được tạo bởi giáo viên khác.",
        },
        { status: 403 }
      );
    }

    // Tìm tất cả chuyên đề thuộc môn học này
    const topics = await Topic.find({ subject_id: id }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);

    // Kiểm tra xem có câu hỏi nào thuộc các chuyên đề này không
    const questionCount = await Question.countDocuments({
      topic_id: { $in: topicIds },
    });

    if (questionCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Không thể xóa môn "${subject.subject_name}" vì đang chứa ${questionCount} câu hỏi trong ngân hàng. Hãy chuyển hoặc xóa các câu hỏi trước khi xóa môn học để tránh mất tài liệu!`,
        },
        { status: 400 }
      );
    }

    // Nếu không còn câu hỏi nào, xóa sạch các chuyên đề rỗng thuộc môn này và xóa môn
    if (topicIds.length > 0) {
      await Topic.deleteMany({ subject_id: id });
    }
    await Subject.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Đã xóa môn học "${subject.subject_name}" thành công!`,
    });
  } catch (error) {
    console.error("Lỗi khi xóa môn học:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi xóa môn học" },
      { status: 500 }
    );
  }
}
