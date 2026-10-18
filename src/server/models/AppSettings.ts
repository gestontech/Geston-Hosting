import mongoose from "mongoose";

const AppSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
});

export const AppSettings = mongoose.model("AppSettings", AppSettingsSchema);

export async function getSetting(key: string, defaultValue: unknown = null): Promise<unknown> {
  const doc = await AppSettings.findOne({ key }).lean();
  return doc ? doc.value : defaultValue;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await AppSettings.findOneAndUpdate({ key }, { value }, { upsert: true });
}
