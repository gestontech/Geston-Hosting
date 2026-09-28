import mongoose from "mongoose";

const BoostOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  serviceName: {
    type: String,
    required: true,
  },

  category: {
    type: String,
    default: "",
  },

  link: {
    type: String,
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
  },

  // Les nouvelles commandes sont toujours gratuites.
  // Les anciennes valeurs peuvent rester en base pour compatibilité
  // avec l'historique existant.
  costKes: {
    type: Number,
    required: true,
    default: 0,
  },

  costTx: {
    type: Number,
    required: true,
    default: 0,
  },

  paymentMethod: {
    type: String,
    enum: ["tx", "direct", "free"],
    default: "free",
  },

  // Champs conservés uniquement pour compatibilité avec les anciennes
  // commandes payantes. Les nouvelles commandes gratuites ne les utilisent pas.
  paymentGateway: {
    type: String,
    default: "",
  },

  paymentRef: {
    type: String,
    default: "",
  },

  providerOrderId: {
    type: String,
    default: "",
  },

  providerServiceId: {
    type: Number,
    required: true,
  },

  providerCode: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    enum: [
      "awaiting_payment",
      "pending",
      "processing",
      "completed",
      "partial",
      "failed",
      "refunded",
    ],
    default: "pending",
    index: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

BoostOrderSchema.index({
  userId: 1,
  createdAt: -1,
});

export const BoostOrder = mongoose.model(
  "BoostOrder",
  BoostOrderSchema
);

export interface IBoostOrder {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  serviceName: string;
  category: string;
  link: string;
  quantity: number;

  costKes: number;
  costTx: number;

  paymentMethod: "tx" | "direct" | "free";

  paymentGateway: string;
  paymentRef: string;

  providerOrderId: string;
  providerServiceId: number;
  providerCode: string;

  status:
    | "awaiting_payment"
    | "pending"
    | "processing"
    | "completed"
    | "partial"
    | "failed"
    | "refunded";

  createdAt: Date;
  updatedAt: Date;
}
