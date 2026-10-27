import mongoose, { models, Schema, Document } from "mongoose";

export interface ILearningProgress extends Document {
  user_id: mongoose.Types.ObjectId; // hocvien_id
  roadmap_id: mongoose.Types.ObjectId; // lotrinh_id
  completion_percentage: number; // phan_tram (0 -> 100%)
  completed_content_ids: mongoose.Types.ObjectId[]; // Cac noi dung da hoan thanh
  last_activity_at: Date; // hoat_dong_cuoi
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Model: LearningProgress (TienDoHocTap)
 * Phân hệ 5: Lộ trình học & Doanh thu
 * Tương ứng bảng TienDoHocTap trong sơ đồ CSDL
 */
const LearningProgressSchema = new Schema<ILearningProgress>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    roadmap_id: {
      type: Schema.Types.ObjectId,
      ref: "Roadmap",
      required: true,
      index: true,
    },
    completion_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completed_content_ids: [
      {
        type: Schema.Types.ObjectId,
      },
    ],
    last_activity_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Một học viên chỉ có 1 bản ghi tiến độ cho 1 lộ trình
LearningProgressSchema.index({ user_id: 1, roadmap_id: 1 }, { unique: true });

export const LearningProgress =
  models.LearningProgress ||
  mongoose.model<ILearningProgress>("LearningProgress", LearningProgressSchema);
