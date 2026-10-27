import mongoose, { models, Schema, Document } from "mongoose";
import { Question, IOption } from "./Question";

export interface IExamOptionSnapshot {
  option_id: mongoose.Types.ObjectId;
  option_label: string;
  content: string;
  is_correct: boolean;
}

export interface IExamQuestionSnapshot {
  content: string;
  difficulty_level: "easy" | "medium" | "hard";
  explanation?: string;
  options: IExamOptionSnapshot[];
}

export interface IExamQuestion {
  question_id: mongoose.Types.ObjectId;
  question_order: number;
  question_score: number;
  question_snapshot?: IExamQuestionSnapshot;
}

export interface IExam extends Document {
  subject_id?: mongoose.Types.ObjectId;
  created_by: mongoose.Types.ObjectId;
  title: string;
  duration_minutes: number;
  total_questions: number;
  pass_score: number;
  max_score: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  allow_view_result_immediately: boolean;
  is_published: boolean;
  questions: IExamQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const ExamOptionSnapshotSchema = new Schema(
  {
    option_id: { type: Schema.Types.ObjectId, required: true },
    option_label: { type: String, required: true },
    content: { type: String, required: true },
    is_correct: { type: Boolean, required: true },
  },
  { _id: false }
);

const ExamQuestionSnapshotSchema = new Schema(
  {
    content: { type: String, required: true },
    difficulty_level: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    explanation: { type: String, default: "" },
    options: { type: [ExamOptionSnapshotSchema], required: true },
  },
  { _id: false }
);


const ExamQuestionSchema = new Schema({
  question_id: {
    type: Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },
  question_order: {
    type: Number,
    min: 1,
    required: true,
  },
  question_score: {
    type: Number,
    min: 0,
    default: 1,
  },
  question_snapshot: {
    type: ExamQuestionSnapshotSchema,
  },
});


const ExamSchema = new Schema<IExam>(
  {
    subject_id: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Giáo viên tạo đề thi là bắt buộc"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Tiêu đề đề thi là bắt buộc"],
      trim: true,
      maxlength: 255,
    },
    duration_minutes: {
      type: Number,
      required: [true, "Thời gian làm bài là bắt buộc"],
      min: [1, "Thời gian làm bài phải tối thiểu 1 phút"],
    },
    total_questions: {
      type: Number,
      min: 0,
      default: 0,
    },
    pass_score: {
      type: Number,
      default: 5.0,
      min: 0,
    },
    max_score: {
      type: Number,
      min: 0,
      default: 10.0,
    },
    shuffle_questions: {
      type: Boolean,
      default: true,
    },
    shuffle_options: {
      type: Boolean,
      default: true,
    },
    allow_view_result_immediately: {
      type: Boolean,
      default: true,
    },
    is_published: {
      type: Boolean,
      default: false,
      index: true,
    },
    questions: {
      type: [ExamQuestionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ExamSchema.pre("validate", async function () {
  this.total_questions = this.questions.length;
  this.max_score = this.questions.reduce(
    (total, question) => total + (question.question_score || 1),
    0
  );

  const questionsToSnapshot = this.isNew
    ? this.questions
    : this.questions.filter((question) => !question.question_snapshot);

  if (questionsToSnapshot.length === 0) return;

  const sourceQuestions = await Question.find({
    _id: { $in: questionsToSnapshot.map((q) => q.question_id) },
  }).select("content difficulty_level explanation options");

  const sourceQuestionsById = new Map(
    sourceQuestions.map((q) => [q._id.toString(), q])
  );

  for (const examQuestion of questionsToSnapshot) {
    const source = sourceQuestionsById.get(examQuestion.question_id.toString());
    if (source) {
      examQuestion.question_snapshot = {
        content: source.content,
        difficulty_level: source.difficulty_level,
        explanation: source.explanation,
        options: source.options.map((opt: IOption) => ({
          option_id: opt._id as mongoose.Types.ObjectId,
          option_label: opt.option_label,
          content: opt.content,
          is_correct: opt.is_correct,
        })),
      };
    }
  }
});

export const Exam = models.Exam || mongoose.model<IExam>("Exam", ExamSchema);