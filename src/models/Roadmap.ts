import mongoose, { models, Schema, Document } from "mongoose";

export interface IStageContent {
  _id?: mongoose.Types.ObjectId;
  content_type: "exam" | "practice" | "lesson"; // loai_noi_dung
  exam_id?: mongoose.Types.ObjectId | null; // dethi_id
  title: string;
  order: number; // thu_tu
}

export interface IRoadmapStage {
  _id?: mongoose.Types.ObjectId;
  stage_title: string; // ten_giai_doan
  order: number; // thu_tu
  description?: string; // mo_ta
  contents: IStageContent[]; // NoiDungGiaiDoan nhúng
}

export interface IRoadmap extends Document {
  teacher_id: mongoose.Types.ObjectId; // giaovien_id
  title: string; // ten_lo_trinh
  description?: string; // mo_ta
  price: number; // gia_ban
  cover_image?: string; // anh_bia
  is_published: boolean; // da_xuat_ban
  stages: IRoadmapStage[]; // GiaiDoanLoTrinh nhúng
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subdocument: StageContentSchema (NoiDungGiaiDoan)
 * Tương ứng bảng NoiDungGiaiDoan trong sơ đồ CSDL
 */
const StageContentSchema = new Schema<IStageContent>({
  content_type: {
    type: String,
    enum: ["exam", "practice", "lesson"],
    default: "exam",
    required: true,
  },
  exam_id: {
    type: Schema.Types.ObjectId,
    ref: "Exam",
    default: null,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  order: {
    type: Number,
    required: true,
    min: 1,
  },
});

/**
 * Subdocument: RoadmapStageSchema (GiaiDoanLoTrinh)
 * Tương ứng bảng GiaiDoanLoTrinh trong sơ đồ CSDL
 */
const RoadmapStageSchema = new Schema<IRoadmapStage>({
  stage_title: {
    type: String,
    required: [true, "Tên giai đoạn là bắt buộc"],
    trim: true,
    maxlength: 150,
  },
  order: {
    type: Number,
    required: true,
    min: 1,
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  contents: {
    type: [StageContentSchema],
    default: [],
  },
});

/**
 * Model: Roadmap (LoTrinhHoc)
 * Phân hệ 5: Lộ trình học & Doanh thu
 * Tương ứng bảng LoTrinhHoc & nhúng GiaiDoanLoTrinh, NoiDungGiaiDoan
 */
const RoadmapSchema = new Schema<IRoadmap>(
  {
    teacher_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Giáo viên tạo lộ trình là bắt buộc"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Tên lộ trình là bắt buộc"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      default: 0,
      min: [0, "Giá bán không được nhỏ hơn 0"],
    },
    cover_image: {
      type: String,
      trim: true,
      default: "",
    },
    is_published: {
      type: Boolean,
      default: false,
      index: true,
    },
    stages: {
      type: [RoadmapStageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Roadmap =
  models.Roadmap || mongoose.model<IRoadmap>("Roadmap", RoadmapSchema);
