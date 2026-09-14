import mongoose from "mongoose";

const BugReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, default: "" },
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 4000 },
    pageUrl: { type: String, default: "", maxlength: 500 },
    status: {
      type: String,
      enum: ["pending", "reviewing", "rewarded", "rejected", "closed"],
      default: "pending",
      index: true,
    },
    rewardTx: { type: Number, default: 0 },
    adminNote: { type: String, default: "" },
    rewardedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const BugReport = mongoose.model("BugReport", BugReportSchema);
