import mongoose from "mongoose";

const WaOwnerSessionSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, unique: true },
    phoneNumber: { type: String, default: "" },
    credsJson: { type: String, default: "" },
    status: {
      type: String,
      enum: ["disconnected", "pairing", "connected"],
      default: "disconnected",
    },
    lastConnectedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const WaOwnerSession = mongoose.model("WaOwnerSession", WaOwnerSessionSchema);
