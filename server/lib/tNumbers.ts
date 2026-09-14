/**
 * T_NUMBERS — comma-separated WhatsApp numbers (digits + country code)
 * that may use unrestricted AI (any topic) while still identifying as
 * the Geston Hosting assistant. Not owner/dev privileges — topic bypass only.
 */

function digitsOnly(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

/** Parsed list of T_NUMBERS from env (digits only, min length 8). */
export function getTNumbers(): string[] {
  const raw = process.env.T_NUMBERS || "";
  if (!raw.trim()) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const d = digitsOnly(part);
    if (d.length >= 8 && !seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
}

/** True if this phone (any format) is listed in T_NUMBERS. */
export function isTNumber(phoneOrJid: string): boolean {
  const from = digitsOnly(phoneOrJid.split("@")[0] || phoneOrJid);
  if (from.length < 8) return false;
  const list = getTNumbers();
  if (list.length === 0) return false;
  return list.some((n) => n === from || from.endsWith(n) || n.endsWith(from));
}
