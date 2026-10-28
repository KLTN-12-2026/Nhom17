//src\models\Order.ts
import mongoose, { models, Schema, Document } from "mongoose";

export interface IOrder extends Document {
  user_id: mongoose.Types.ObjectId; // hocvien_id
  roadmap_id: mongoose.Types.ObjectId; // lotrinh_id
  order_code: string; // ma_don_hang (UK)
  amount: number; // so_tien
  payment_method: "momo" | "vnpay" | "banking" | "free"; // phuong_thuc
  status: "pending" | "completed" | "failed" | "cancelled"; // trang_thai: DangCho | ThanhCong...
  paid_at?: Date | null; // ngay_thanh_toan
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Model: Order (DonHangGiaoDich)
 * Phân hệ 5: Lộ trình học & Doanh thu
 * Tương ứng bảng DonHangGiaoDich trong sơ đồ CSDL (Dữ liệu tài chính không xóa vật lý)
 */
const OrderSchema = new Schema<IOrder>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Học viên là bắt buộc"],
      index: true,
    },
    roadmap_id: {
      type: Schema.Types.ObjectId,
      ref: "Roadmap",
      required: [true, "Lộ trình học là bắt buộc"],
      index: true,
    },
    order_code: {
      type: String,
      required: [true, "Mã đơn hàng là bắt buộc"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    amount: {
      type: Number,
      required: [true, "Số tiền thanh toán là bắt buộc"],
      min: [0, "Số tiền không được âm"],
    },
    payment_method: {
      type: String,
      enum: ["momo", "vnpay", "banking", "free"],
      default: "banking",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    paid_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const Order =
  models.Order || mongoose.model<IOrder>("Order", OrderSchema);
