import mongoose, { models, Schema, Document } from "mongoose";

export interface IStudentAnswer {
  _id?: mongoose.Types.ObjectId;
  question_id: mongoose.Types.ObjectId; // cauhoi_id
  selected_option_id?: mongoose.Types.ObjectId | null; // dapan_chon_id
  is_correct?: boolean; // dung_hay_sai
  answered_at?: Date;
}

export interface IViolationLog {
  _id?: mongoose.Types.ObjectId;
  violation_type:
    | "tab_switch"
    | "multiple_faces"
    | "no_face"
    | "looking_away"
    | "window_blur"
    | "other"; // loai_vi_pham
  violation_time: Date; // thoi_diem
  violation_count: number; // so_lan_vi_pham
  evidence_detail?: string; // chi_tiet_bang_chung (Log hoặc URL ảnh vi phạm)
}

export interface IAiAnalysis {
  weak_points?: string; // danh_gia_diem_yeu
  ai_feedback?: string; // nhan_xet_ai
  recommended_topics: mongoose.Types.ObjectId[]; // goi_y_chude_ids
  created_at: Date;
}

export interface IExamAttempt extends Document {
  user_id: mongoose.Types.ObjectId; // hocvien_id
  exam_id: mongoose.Types.ObjectId; // dethi_id
  room_id?: mongoose.Types.ObjectId | null; // phongthi_id (null nếu luyện thi tự do)
  attempt_type: "practice" | "official";
  score: number; // diem_so
  total_correct: number; // so_cau_dung
  total_wrong: number; // so_cau_sai
  start_time: Date; // bat_dau_luc
  submit_time?: Date | null; // nop_bai_luc
  duration_seconds: number; // thoi_gian_lam_giay
  status: "in_progress" | "submitted" | "revoked" | "timed_out"; // trang_thai
  answers: IStudentAnswer[]; // ChiTietTraLoi nhúng
  violations: IViolationLog[]; // GiamSatGianLan nhúng
  ai_analysis?: IAiAnalysis; // PhanTichAI nhúng (1-1)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subdocument: StudentAnswerSchema (ChiTietTraLoi)
 * Tương ứng bảng ChiTietTraLoi trong sơ đồ CSDL
 */
const StudentAnswerSchema = new Schema<IStudentAnswer>({
  question_id: {
    type: Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },
  selected_option_id: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  is_correct: {
    type: Boolean,
    default: null,
  },
  answered_at: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Subdocument: ViolationLogSchema (GiamSatGianLan)
 * Tương ứng bảng GiamSatGianLan trong sơ đồ CSDL (Proctor AI)
 */
const ViolationLogSchema = new Schema<IViolationLog>({
  violation_type: {
    type: String,
    enum: [
      "tab_switch",
      "multiple_faces",
      "no_face",
      "looking_away",
      "window_blur",
      "other",
    ],
    required: true,
  },
  violation_time: {
    type: Date,
    default: Date.now,
  },
  violation_count: {
    type: Number,
    default: 1,
    min: 1,
  },
  evidence_detail: {
    type: String,
    default: "",
  },
});

/**
 * Subdocument: AiAnalysisSchema (PhanTichAI)
 * Tương ứng bảng PhanTichAI trong sơ đồ CSDL (quan hệ 1-1)
 */
const AiAnalysisSchema = new Schema<IAiAnalysis>(
  {
    weak_points: {
      type: String,
      default: "",
    },
    ai_feedback: {
      type: String,
      default: "",
    },
    recommended_topics: [
      {
        type: Schema.Types.ObjectId,
        ref: "Topic",
      },
    ],
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * Model: ExamAttempt (BaiThiHocVien)
 * Phân hệ 4: Làm bài, giám sát gian lận & phân tích AI
 * Tương ứng bảng BaiThiHocVien & nhúng ChiTietTraLoi, GiamSatGianLan, PhanTichAI
 */
const ExamAttemptSchema = new Schema<IExamAttempt>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    exam_id: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    room_id: {
      type: Schema.Types.ObjectId,
      ref: "ExamRoom",
      default: null,
      index: true,
    },
    attempt_type: {
      type: String,
      enum: ["practice", "official"],
      default: "practice",
      index: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_correct: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_wrong: {
      type: Number,
      default: 0,
      min: 0,
    },
    start_time: {
      type: Date,
      default: Date.now,
    },
    submit_time: {
      type: Date,
      default: null,
    },
    duration_seconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "revoked", "timed_out"],
      default: "in_progress",
      index: true,
    },
    answers: {
      type: [StudentAnswerSchema],
      default: [],
    },
    violations: {
      type: [ViolationLogSchema],
      default: [],
    },
    ai_analysis: {
      type: AiAnalysisSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index phục vụ tra cứu lịch sử thi và thống kê nhanh
ExamAttemptSchema.index({ user_id: 1, exam_id: 1, createdAt: -1 });
ExamAttemptSchema.index({ room_id: 1, status: 1 });

export const ExamAttempt =
  models.ExamAttempt ||
  mongoose.model<IExamAttempt>("ExamAttempt", ExamAttemptSchema);