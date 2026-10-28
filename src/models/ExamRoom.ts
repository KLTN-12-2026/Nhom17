//src\models\ExamRoom.ts
import mongoose, { models, Schema, Document } from "mongoose";

export interface IRoomCandidate {
  _id?: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId; // hocvien_id
  joined_at: Date; // vao_phong_luc
  connection_status: "connected" | "disconnected" | "submitted"; // trang_thai_ket_noi
}

export interface IExamRoom extends Document {
  room_code: string; // ma_phong
  exam_id: mongoose.Types.ObjectId; // dethi_id
  teacher_id: mongoose.Types.ObjectId; // giaovien_id
  start_time: Date; // bat_dau_luc
  end_time: Date; // ket_thuc_luc
  status: "waiting" | "in_progress" | "finished"; // trang_thai: Cho | DangThi | KetThuc
  candidates: IRoomCandidate[]; // ThiSinhPhongThi nhúng
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subdocument: RoomCandidateSchema (ThiSinhPhongThi)
 * Tương ứng bảng ThiSinhPhongThi trong sơ đồ CSDL
 */
const RoomCandidateSchema = new Schema<IRoomCandidate>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  joined_at: {
    type: Date,
    default: Date.now,
  },
  connection_status: {
    type: String,
    enum: ["connected", "disconnected", "submitted"],
    default: "connected",
  },
});

/**
 * Model: ExamRoom (PhongThi)
 * Phân hệ 3: Đề thi & Phòng thi trực tiếp (Socket.IO)
 * Tương ứng bảng PhongThi & nhúng ThiSinhPhongThi
 */
const ExamRoomSchema = new Schema<IExamRoom>(
  {
    room_code: {
      type: String,
      required: [true, "Mã phòng thi là bắt buộc"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    exam_id: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: [true, "Đề thi là bắt buộc"],
      index: true,
    },
    teacher_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Giáo viên chủ trì là bắt buộc"],
      index: true,
    },
    start_time: {
      type: Date,
      required: [true, "Thời gian bắt đầu là bắt buộc"],
    },
    end_time: {
      type: Date,
      required: [true, "Thời gian kết thúc là bắt buộc"],
    },
    status: {
      type: String,
      enum: ["waiting", "in_progress", "finished"],
      default: "waiting",
      index: true,
    },
    candidates: {
      type: [RoomCandidateSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const ExamRoom =
  models.ExamRoom || mongoose.model<IExamRoom>("ExamRoom", ExamRoomSchema);
