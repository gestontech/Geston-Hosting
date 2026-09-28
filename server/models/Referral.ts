import mongoose from "mongoose";

/**
 * Referral / parrainage.
 *
 * Le système de parrainage est conservé pour garder les relations
 * entre utilisateurs et les statistiques existantes.
 *
 * Les récompenses Coins sont désactivées en mode gratuit.
 */

const ReferralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  referredId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  /**
   * Legacy uniquement.
   *
   * Les nouveaux parrainages ne donnent plus de Coins.
   */
  txRewarded: {
    type: Number,
    default: 0,
    min: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  flagged: {
    type: Boolean,
    default: false,
  },

  flagReason: {
    type: String,
    default: "",
  },
});

export const Referral = mongoose.model(
  "Referral",
  ReferralSchema
);

export interface IReferral {
  _id: mongoose.Types.ObjectId;

  referrerId: mongoose.Types.ObjectId;

  referredId: mongoose.Types.ObjectId;

  /**
   * Toujours 0 pour les nouveaux parrainages.
   */
  txRewarded: number;

  createdAt: Date;

  flagged?: boolean;

  flagReason?: string;
}
