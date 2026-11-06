import { connectDB } from "@/lib/db";
import { Topic, Question } from "@/models";
import { checkApiAuthorization } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Tìm toàn bộ danh sách ID các chuyên đề con cháu đệ quy của một topic
 */
async function getDescendantTopicIds(rootTopicId: string, subjectId: string): Promise<string[]> {
  const allTopicsInSubject = await Topic.find({ subject_id: subjectId })
    .select("_id parent_id")
    .lean();

  const childrenMap = new Map<string, string[]>();
  for (const t of allTopicsInSubject) {
    if (t.parent_id) {
      const pId = String(t.parent_id);
      if (!childrenMap.has(pId)) childrenMap.set(pId, []);
      childrenMap.get(pId)!.push(String(t._id));
    }
  }

  const descendants: string[] = [];
  const queue: string[] = [rootTopicId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const kids = childrenMap.get(curr) || [];
    for (const k of kids) {
      descendants.push(k);
      queue.push(k);
    }
  }
  return descendants;
}

/**
 * PUT /api/instructor/topics/[id]
 * Cập nhật thông tin chuyên đề (tên, mô tả, chuyển nhánh cha parent_id)
 */
export async function PUT(request: Request, context: RouteParams) {
  const { user, errorResponse } = await checkApiAuthorization(["instructor", "admin"]);
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { topic_name, description, parent_id } = body;

    if (!topic_name || typeof topic_name !== "string" || !topic_name.trim()) {
      return NextResponse.json(
        { success: false, message: "Tên chuyên đề không được để trống" },
        { status: 400 }
      );
    }

    await connectDB();

    const topic = await Topic.findById(id);
    if (!topic) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy chuyên đề cần cập nhật" },
        { status: 404 }
      );
    }

    // Kiểm tra quyền sở hữu: Chỉ người tạo hoặc Admin mới được sửa
    if (
      user?.role !== "admin" &&
      topic.created_by &&
      topic.created_by.toString() !== user?.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền chỉnh sửa chuyên đề này vì nó được tạo bởi giáo viên khác.",
        },
        { status: 403 }
      );
    }

    const oldLevel = topic.level || 1;
    let newParentId: string | null = topic.parent_id ? String(topic.parent_id) : null;
    let newLevel = oldLevel;

    // Nếu người dùng truyền parent_id (bao gồm cả null để đưa về cấp 1)
    if (parent_id !== undefined) {
      if (!parent_id || parent_id === "null" || parent_id === "") {
        newParentId = null;
        newLevel = 1;
      } else {
        const targetParentId = String(parent_id).trim();
        if (targetParentId === String(id)) {
          return NextResponse.json(
            { success: false, message: "Chuyên đề không thể nhận chính nó làm chuyên đề cha" },
            { status: 400 }
          );
        }

        const descendants = await getDescendantTopicIds(String(id), String(topic.subject_id));
        if (descendants.includes(targetParentId)) {
          return NextResponse.json(
            {
              success: false,
              message: "Không thể chuyển chuyên đề vào bên trong chuyên đề con của chính nó",
            },
            { status: 400 }
          );
        }

        const parentDoc = await Topic.findById(targetParentId);
        if (!parentDoc || String(parentDoc.subject_id) !== String(topic.subject_id)) {
          return NextResponse.json(
            { success: false, message: "Chuyên đề cha không hợp lệ hoặc khác môn học" },
            { status: 400 }
          );
        }

        newParentId = String(parentDoc._id);
        newLevel = (parentDoc.level || 1) + 1;
      }
    }

    const trimmedName = topic_name.trim();
    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Kiểm tra trùng tên ở cùng cấp trong cùng môn
    const duplicate = await Topic.findOne({
      _id: { $ne: id },
      subject_id: topic.subject_id,
      parent_id: newParentId,
      topic_name: { $regex: new RegExp(`^${escapedName}$`, "i") },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "Tên chuyên đề này đã tồn tại ở cùng cấp trong môn học" },
        { status: 400 }
      );
    }

    const levelDiff = newLevel - oldLevel;
    topic.topic_name = trimmedName;
    if (typeof description === "string") {
      topic.description = description.trim();
    }
    topic.parent_id = newParentId ? (newParentId as unknown as typeof topic.parent_id) : null;
    topic.level = newLevel;
    await topic.save();

    // Nếu thay đổi cấp độ (level), cập nhật độ sâu cho các nhánh con cháu
    if (levelDiff !== 0) {
      const descendants = await getDescendantTopicIds(String(id), String(topic.subject_id));
      if (descendants.length > 0) {
        await Topic.updateMany(
          { _id: { $in: descendants } },
          { $inc: { level: levelDiff } }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cập nhật chuyên đề thành công!",
      topic,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật chuyên đề:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi cập nhật chuyên đề" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/instructor/topics/[id]
 * Xóa một chuyên đề kèm kiểm tra quyền sở hữu và bảo vệ an toàn câu hỏi trên toàn nhánh
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

    // Lấy toàn bộ ID của chuyên đề này + tất cả chuyên đề con cháu
    const descendants = await getDescendantTopicIds(String(id), String(topic.subject_id));
    const allBranchIds = [String(id), ...descendants];

    // Kiểm tra xem có câu hỏi nào thuộc nhánh chuyên đề này không
    const questionCount = await Question.countDocuments({
      topic_id: { $in: allBranchIds },
    });
    if (questionCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Không thể xóa chuyên đề "${topic.topic_name}" vì nhánh này đang chứa ${questionCount} câu hỏi trong ngân hàng. Hãy xóa hoặc chuyển các câu hỏi sang chuyên đề khác trước!`,
        },
        { status: 400 }
      );
    }

    // Xóa các chuyên đề con phụ thuộc (nếu có) và xóa chuyên đề này
    if (descendants.length > 0) {
      await Topic.deleteMany({ _id: { $in: descendants } });
    }
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
