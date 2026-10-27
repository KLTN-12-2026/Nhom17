import mongoose, { models, Schema, Document } from "mongoose";

export interface IPasswordResetToken extends Document {
  user_id: mongoose.Types.ObjectId;
  token_hash: string;
  expires_at: Date;
  used_at?: Date | null;
  is_used: boolean;
  createdAt: Date;
  updatedAt: Date;
}


const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token_hash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    used_at: {
      type: Date,
      default: null,
    },
    is_used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: Tự động xóa token sau khi hết hạn để giải phóng bộ nhớ
PasswordResetTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken =
  models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>(
    "PasswordResetToken",
    PasswordResetTokenSchema
  );
