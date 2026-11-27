//src\models\Order.ts
import mongoose, { models, Schema, Document } from "mongoose";

export interface IOrder extends Document {
  user_id: mongoose.Types.ObjectId;
  roadmap_id: mongoose.Types.ObjectId;
  order_code: string;
  amount: number;
  payment_method: "momo" | "vnpay" | "banking" | "free";
  status: "pending" | "completed" | "failed" | "cancelled";
  paid_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    roadmap_id: { type: Schema.Types.ObjectId, ref: "Roadmap", required: true, index: true },
    order_code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    amount: { type: Number, required: true, min: 0 },
    payment_method: { type: String, enum: ["momo", "vnpay", "banking", "free"], default: "banking" },
    status: { type: String, enum: ["pending", "completed", "failed", "cancelled"], default: "pending", index: true },
    paid_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Order = models.Order || mongoose.model<IOrder>("Order", OrderSchema);
