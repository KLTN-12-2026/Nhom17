import mongoose, { models, Schema, Document } from "mongoose";

export interface IOption {
  _id?: mongoose.Types.ObjectId;
  option_label: string;
  content: string;
  is_correct: boolean;
}

export interface IQuestion extends Document {
  topic_id: mongoose.Types.ObjectId;
  created_by: mongoose.Types.ObjectId;
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  is_ai_generated: boolean;
  explanation?: string;
  options: IOption[];
  createdAt: Date;
  updatedAt: Date;
}


const OptionSchema = new Schema<IOption>({
  option_label: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5,
  },
  content: {
    type: String,
    required: [true, "Nội dung đáp án là bắt buộc"],
    trim: true,
  },
  is_correct: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const QuestionSchema = new Schema<IQuestion>(
  {
    topic_id: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      required: [true, "Chủ đề là bắt buộc"],
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Giáo viên tạo câu hỏi là bắt buộc"],
      index: true,
    },
    content: {
      type: String,
      required: [true, "Nội dung câu hỏi là bắt buộc"],
      trim: true,
    },
    difficulty_level: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
      index: true,
    },
    is_ai_generated: {
      type: Boolean,
      default: false,
      index: true,
    },
    explanation: {
      type: String,
      trim: true,
      default: "",
    },
    options: {
      type: [OptionSchema],
      validate: {
        validator: function (opts: IOption[]) {
          return Array.isArray(opts) && opts.length >= 2;
        },
        message: "Câu hỏi trắc nghiệm phải có ít nhất 2 đáp án lựa chọn",
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Question =
  models.Question || mongoose.model<IQuestion>("Question", QuestionSchema);