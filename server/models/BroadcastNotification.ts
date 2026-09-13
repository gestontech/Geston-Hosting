import mongoose from "mongoose";

const BroadcastNotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ["topup", "deploy", "expiring", "deleted", "renewed", "general"], default: "general" },
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

BroadcastNotificationSchema.index({ createdAt: -1 });

export const BroadcastNotification = mongoose.model("BroadcastNotification", BroadcastNotificationSchema);

export interface IBroadcastNotification {
  _id: mongoose.Types.ObjectId;
  type: "topup" | "deploy" | "expiring" | "deleted" | "renewed" | "general";
  title: string;
  message: string;
  createdAt: Date;
}
