import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["topup", "deploy", "panel", "renew", "refund", "admin_grant", "boost"], required: true },
  txAmount: { type: Number, required: true },
  ksAmount: { type: Number, default: 0 },
  paystackRef: { type: String, default: "" },
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  paystackCountry: { type: String, enum: ["kenya", "nigeria", "cameroon", "tanzania", "drc"], default: "kenya" },
  createdAt: { type: Date, default: Date.now, index: true }
});

TransactionSchema.index({ userId: 1, createdAt: -1 });

export const Transaction = mongoose.model("Transaction", TransactionSchema);

export interface ITransaction {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: "topup" | "deploy" | "panel" | "renew" | "refund" | "admin_grant" | "boost";
  txAmount: number;
  ksAmount: number;
  paystackRef: string;
  status: "pending" | "success" | "failed";
  paystackCountry: "kenya" | "nigeria" | "cameroon" | "tanzania" | "drc";
  createdAt: Date;
}
