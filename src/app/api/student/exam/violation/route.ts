import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { ExamAttempt } from "@/models";
import mongoose from "mongoose";
import { broadcastViolationEvent } from "@/lib/proctor-live-bus";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      attempt_id,
      room_id,
      violation_type = "other",
      description = "Hành vi nghi vấn trong khi làm bài",
      evidence_detail = "",
      max_violations = 3,
    } = body;

    let totalViolations = 1;
    let isRevoked = false;
    let finalRoomId = room_id ? String(room_id) : "";

    // 1. Kiểm tra nếu là Attempt thật trong MongoDB
    if (attempt_id && mongoose.Types.ObjectId.isValid(attempt_id)) {
      await connectDB();
      const attempt = await ExamAttempt.findById(attempt_id);
      if (attempt) {
        if (attempt.room_id) {
          finalRoomId = String(attempt.room_id);
        }
        // Nếu bài thi đã bị đình chỉ trước đó thì không ghi nhận thêm vi phạm
        if (attempt.status === "revoked") {
          return NextResponse.json({
            success: true,
            violation_count: Math.min(attempt.violations.length, max_violations),
            is_revoked: true,
            message: "Bài thi đã bị đình chỉ thi.",
          });
        }

        // Chống ghi trùng lặp vi phạm gửi liên tiếp trong khoảng thời gian < 3000ms
        const lastViolation = attempt.violations[attempt.violations.length - 1];
        if (lastViolation) {
          const timeDiff = Date.now() - new Date(lastViolation.violation_time).getTime();
          if (timeDiff < 3000) {
            return NextResponse.json({
              success: true,
              violation_count: Math.min(attempt.violations.length, max_violations),
              is_revoked: attempt.violations.length >= max_violations,
              message: "Vi phạm vừa được ghi nhận gần đây.",
            });
          }
        }

        // Ghi nhận vi phạm mới
        attempt.violations.push({
          violation_type,
          violation_time: new Date(),
          violation_count: Math.min((attempt.violations.length || 0) + 1, max_violations),
          evidence_detail: evidence_detail || "",
        });

        totalViolations = Math.min(attempt.violations.length, max_violations);
        if (attempt.violations.length >= max_violations) {
          attempt.status = "revoked";
          isRevoked = true;
        }

        await attempt.save();
      }
    } else {
      // Mock attempt cho chế độ kiểm thử
      totalViolations = Math.min(Number(body.current_count) || 1, max_violations);
      if (totalViolations >= max_violations) {
        isRevoked = true;
      }
    }

    // 2. Phát sự kiện vào live bus để Giáo viên giám sát nhận ngay tức khắc
    broadcastViolationEvent({
      id: "ev_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      room_id: finalRoomId,
      attempt_id: attempt_id || "mock_attempt",
      candidate_id: user.id,
      candidate_name: user.name || "Học viên thi",
      violation_type,
      description,
      violation_count: totalViolations,
      max_violations,
      evidence_snapshot: evidence_detail || null,
      timestamp: new Date().toISOString(),
      is_revoked: isRevoked,
    });

    return NextResponse.json({
      success: true,
      violation_count: totalViolations,
      is_revoked: isRevoked,
      message: isRevoked
        ? "Bài thi đã bị đình chỉ do vi phạm quy chế quá số lần quy định."
        : "Đã ghi nhận vi phạm vào hệ thống giám sát.",
    });
  } catch (error) {
    console.error("Lỗi API ghi nhận vi phạm:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ khi ghi nhận vi phạm." },
      { status: 500 }
    );
  }
}
