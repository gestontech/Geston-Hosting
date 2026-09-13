import mongoose from "mongoose";
import { Notification } from "../models/Notification.js";

export type NotificationType =
  | "topup"
  | "deploy"
  | "expiring"
  | "deleted"
  | "renewed"
  | "general"
  | "refund"
  | "boost"
  | "reward";

const MAX_PER_USER = 200;

export async function createNotification(
  userId: mongoose.Types.ObjectId | string,
  type: NotificationType,
  title: string,
  message: string
): Promise<void> {
  try {
    await Notification.create({ userId, type, title, message });
    const count = await Notification.countDocuments({ userId });
    if (count > MAX_PER_USER) {
      const excess = await Notification.find({ userId })
        .sort({ createdAt: 1 })
        .limit(count - MAX_PER_USER)
        .select("_id");
      await Notification.deleteMany({ _id: { $in: excess.map((n) => n._id) } });
    }
  } catch {}
}
