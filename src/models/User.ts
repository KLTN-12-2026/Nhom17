import mongoose, { models, Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone_number?: string;
  avatar_url?: string;
  role: "admin" | "instructor" | "student";
  status: "active" | "disabled";
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}


const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Họ và tên là bắt buộc"],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 150,
    },
    password: {
      type: String,
      required: false,
      select: false,
    },
    phone_number: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },
    avatar_url: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["admin", "instructor", "student"],
      default: "student",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = models.User || mongoose.model<IUser>("User", UserSchema);