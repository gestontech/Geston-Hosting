import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  passwordHash: { type: String, default: "" },
  txCoins: { type: Number, default: 0 },
  bots: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bot" }],
  usedFreeTrial: { type: Boolean, default: false },
  trialPhoneNumbers: [{ type: String }],
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: "" },
  bannedAt: { type: Date, default: null },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  paymentFailCount: { type: Number, default: 0 },
  paymentFailDate: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  githubId: { type: String, unique: true, sparse: true },
  googleId: { type: String, unique: true, sparse: true },
  githubUsername: { type: String, default: "" },
  avatarUrl: { type: String, default: "" },
  authProvider: { type: String, enum: ["local", "github", "google"], default: "local" },
  isModerator: { type: Boolean, default: false },
  currency: { type: String, default: "KES" },
  currencySet: { type: Boolean, default: false },
  apiKeyHash: { type: String, default: "", index: true },
  apiKeyEncrypted: { type: String, default: "" },
  apiKeyPrefix: { type: String, default: "" },
  apiKeyActive: { type: Boolean, default: false },
  apiKeyCreatedAt: { type: Date },
  apiKeyLastUsedAt: { type: Date },
  apiCallCount: { type: Number, default: 0 },
});

export const User = mongoose.model("User", UserSchema);

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  username?: string;
  passwordHash: string;
  txCoins: number;
  bots: mongoose.Types.ObjectId[];
  usedFreeTrial: boolean;
  trialPhoneNumbers: string[];
  isBanned: boolean;
  banReason: string;
  bannedAt: Date | null;
  referralCode: string;
  referredBy: mongoose.Types.ObjectId | null;
  paymentFailCount: number;
  paymentFailDate: string;
  createdAt: Date;
  githubId?: string;
  googleId?: string;
  githubUsername?: string;
  avatarUrl?: string;
  authProvider?: "local" | "github" | "google";
  isModerator?: boolean;
  currency?: string;
  currencySet?: boolean;
  apiKeyHash?: string;
  apiKeyEncrypted?: string;
  apiKeyPrefix?: string;
  apiKeyActive?: boolean;
  apiKeyCreatedAt?: Date;
  apiKeyLastUsedAt?: Date;
  apiCallCount?: number;
}
