import crypto from "crypto";

const KEY_PREFIX = "txmd_live_";

function getEncKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set to encrypt or decrypt API keys");
  return crypto.scryptSync(secret, "apikey_enc_salt", 32);
}

export function encryptApiKey(raw: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncKey(), iv);
  const enc = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptApiKey(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const secret = crypto.randomBytes(24).toString("hex");
  const raw = `${KEY_PREFIX}${secret}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, KEY_PREFIX.length + 6);
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function looksLikeApiKey(token: string): boolean {
  return typeof token === "string" && token.startsWith(KEY_PREFIX);
}

export function maskApiKey(prefix: string): string {
  return `${prefix}${"•".repeat(24)}`;
}
