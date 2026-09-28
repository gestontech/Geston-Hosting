import mongoose from "mongoose";

/**
 * Coupon conservé pour compatibilité avec les anciennes données.
 *
 * Geston Hosting fonctionne désormais gratuitement :
 * les coupons ne créditent plus de Coins.
 *
 * txAmount reste présent uniquement pour permettre à Mongoose
 * de lire d'anciennes données sans migration destructive.
 */

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },

  // Legacy uniquement — aucune nouvelle logique ne doit créditer
  // ce montant à un utilisateur.
  txAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },

  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  claimedAt: {
    type: Date,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Coupon = mongoose.model(
  "Coupon",
  CouponSchema
);

export interface ICoupon {
  _id: mongoose.Types.ObjectId;

  code: string;

  /**
   * Legacy uniquement.
   * Toujours 0 pour les nouveaux coupons.
   */
  txAmount: number;

  claimedBy: mongoose.Types.ObjectId | null;

  claimedAt: Date | null;

  createdAt: Date;
}
