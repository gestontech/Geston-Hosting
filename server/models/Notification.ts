import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["topup", "deploy", "expiring", "deleted", "renewed", "general", "refund", "boost", "reward"],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", NotificationSchema);

export interface INotification {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: "topup" | "deploy" | "expiring" | "deleted" | "renewed" | "general" | "refund" | "boost" | "reward";
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}
