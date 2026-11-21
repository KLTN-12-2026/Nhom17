// src/models/AiConversation.ts
import mongoose, { models, Schema, Document } from "mongoose";

export interface IToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  response?: Record<string, unknown> | string;
}

export interface IConversationMessage {
  _id?: mongoose.Types.ObjectId;
  role: "user" | "model" | "system";
  content: string;
  tool_calls?: IToolCallRecord[];
  timestamp: Date;
}

export interface IAiConversation extends Document {
  user_id: mongoose.Types.ObjectId;
  agent_role: "student" | "teacher";
  title: string;
  context_id?: mongoose.Types.ObjectId | null;
  context_type?: "exam" | "attempt" | "general";
  messages: IConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationMessageSchema = new Schema<IConversationMessage>(
  {
    role: {
      type: String,
      enum: ["user", "model", "system"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    tool_calls: [
      {
        name: { type: String, required: true },
        args: { type: Schema.Types.Mixed, default: {} },
        response: { type: Schema.Types.Mixed },
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const AiConversationSchema = new Schema<IAiConversation>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    agent_role: {
      type: String,
      enum: ["student", "teacher"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Cuộc trò chuyện mới",
      trim: true,
      maxlength: 200,
    },
    context_id: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    context_type: {
      type: String,
      enum: ["exam", "attempt", "general"],
      default: "general",
    },
    messages: [ConversationMessageSchema],
  },
  {
    timestamps: true,
  }
);

// Tối ưu hóa truy vấn hội thoại theo user và vai trò
AiConversationSchema.index({ user_id: 1, agent_role: 1, updatedAt: -1 });

export const AiConversation =
  models.AiConversation ||
  mongoose.model<IAiConversation>("AiConversation", AiConversationSchema);
