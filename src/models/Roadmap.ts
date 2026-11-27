//src\models\Roadmap.ts
import mongoose, { models, Schema, Document } from "mongoose";

export interface IRoadmapContent {
  _id?: mongoose.Types.ObjectId;
  content_type: "exam" | "practice" | "lesson"; // loai_noi_dung
  exam_id?: mongoose.Types.ObjectId | null; // dethi_id
  topic_id?: mongoose.Types.ObjectId | null;
  resource_url?: string;
  file_name?: string;
  title: string;
  order: number; // thu_tu
}

export interface ILegacyRoadmapStage {
  _id?: mongoose.Types.ObjectId;
  stage_title: string; // ten_giai_doan
  order: number; // thu_tu
  description?: string; // mo_ta
  contents: IRoadmapContent[];
}

export interface IRoadmap extends Document {
  teacher_id: mongoose.Types.ObjectId; // giaovien_id
  subject_id: mongoose.Types.ObjectId;
  title: string; // ten_lo_trinh
  description?: string; // mo_ta
  price: number; // gia_ban
  cover_image?: string; // anh_bia
  is_published: boolean; // da_xuat_ban
  contents: IRoadmapContent[];
  stages?: ILegacyRoadmapStage[];
  createdAt: Date;
  updatedAt: Date;
}

const RoadmapContentSchema = new Schema<IRoadmapContent>({
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
  topic_id: {
    type: Schema.Types.ObjectId,
    ref: "Topic",
    default: null,
  },
  resource_url: {
    type: String,
    trim: true,
    default: "",
    maxlength: 2048,
  },
  file_name: {
    type: String,
    trim: true,
    default: "",
    maxlength: 255,
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

const LegacyRoadmapStageSchema = new Schema<ILegacyRoadmapStage>({
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
    type: [RoadmapContentSchema],
    default: [],
  },
});

/**
 * Model: Roadmap (LoTrinhHoc)
 * Phân hệ 5: Lộ trình học & Doanh thu
 * Nội dung học được lưu trực tiếp trong lộ trình.
 */
const RoadmapSchema = new Schema<IRoadmap>(
  {
    subject_id: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Môn học của lộ trình là bắt buộc"],
      index: true,
    },
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
    contents: {
      type: [RoadmapContentSchema],
      default: [],
    },
    // Kept only to read existing records; updates migrate contents to the flat field.
    stages: {
      type: [LegacyRoadmapStageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const Roadmap =
  models.Roadmap || mongoose.model<IRoadmap>("Roadmap", RoadmapSchema);
