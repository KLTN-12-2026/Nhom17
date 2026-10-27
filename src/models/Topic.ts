import mongoose, { models, Schema, Document } from "mongoose";

export interface ITopic extends Document {
  subject_id: mongoose.Types.ObjectId;
  parent_id?: mongoose.Types.ObjectId | null;
  topic_name: string;
  level: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}


const TopicSchema = new Schema<ITopic>(
  {
    subject_id: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Môn học là bắt buộc"],
      index: true,
    },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      default: null,
      index: true,
    },
    topic_name: {
      type: String,
      required: [true, "Tên chủ đề là bắt buộc"],
      trim: true,
      maxlength: 150,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Đảm bảo không trùng tên chủ đề cùng cấp trong 1 môn học
TopicSchema.index(
  { subject_id: 1, parent_id: 1, topic_name: 1 },
  { unique: true }
);

export const Topic = models.Topic || mongoose.model<ITopic>("Topic", TopicSchema);
