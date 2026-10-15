import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  type: {
    type: String,
    enum: [
      "topup",
      "deploy",
      "panel",
      "renew",
      "refund",
      "admin_grant",
      "boost",
    ],
    required: true,
  },

  txAmount: {
    type: Number,
    required: true,
  },

  ksAmount: {
    type: Number,
    default: 0,
  },

  paymentAmount: {
    type: Number,
    default: 0,
  },

  currency: {
    type: String,
    default: "USD",
  },

  reference: {
    type: String,
    default: "",
    index: true,
  },

  provider: {
    type: String,
    default: "",
    index: true,
  },

  country: {
    type: String,
    default: "drc",
  },

  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

TransactionSchema.index({
  userId: 1,
  createdAt: -1,
});

export const Transaction = mongoose.model(
  "Transaction",
  TransactionSchema,
);
