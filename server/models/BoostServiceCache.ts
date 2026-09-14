import mongoose from "mongoose";

const BoostServiceCacheSchema = new mongoose.Schema({
  providerId: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true },
  category: { type: String, required: true, index: true },
  provider: { type: String, required: true },
  baseKesPer1000: { type: Number, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  platformId: { type: String, default: "other", index: true },
  serviceType: { type: String, default: "Other" },
  isRegionVariant: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

BoostServiceCacheSchema.index({ platformId: 1, isRegionVariant: 1, name: 1 });

export const BoostServiceCache = mongoose.model("BoostServiceCache", BoostServiceCacheSchema);
