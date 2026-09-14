import mongoose from "mongoose";

const WaContactSchema = new mongoose.Schema(
  {
    jid: { type: String, required: true, unique: true, index: true },
    phoneNumber: { type: String, default: "", index: true },
    username: { type: String, default: "" },
    consentStatus: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
      index: true,
    },
    clientDevice: {
      type: String,
      enum: ["android", "ios", "web", "desktop", "unknown"],
      default: "unknown",
      index: true,
    },
    /** Auto-blocked by security layer (insults / spam / malware). */
    isBlocked: { type: Boolean, default: false, index: true },
    blockedAt: { type: Date, default: null },
    blockReason: { type: String, default: "" },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type WaConsentStatus = "pending" | "accepted" | "declined";
export type WaClientDevice = "android" | "ios" | "web" | "desktop" | "unknown";

export const WaContact = mongoose.model("WaContact", WaContactSchema);
