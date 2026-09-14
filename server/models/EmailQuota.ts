import mongoose from "mongoose";

const EmailQuotaSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  date: { type: String, required: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

EmailQuotaSchema.index({ email: 1, date: 1 }, { unique: true });
EmailQuotaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailQuota = mongoose.model("EmailQuota", EmailQuotaSchema);
