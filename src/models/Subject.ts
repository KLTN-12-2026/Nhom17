import mongoose, { models, Schema, Document } from "mongoose";

export interface ISubject extends Document {
  subject_name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    subject_name: {
      type: String,
      required: [true, "Tên môn học là bắt buộc"],
      trim: true,
      unique: true,
      maxlength: 100,
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

export const Subject =
  models.Subject || mongoose.model<ISubject>("Subject", SubjectSchema);