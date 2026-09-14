const WONYA_BASE = "https://app-api.wonyasoft.com";

export function isDRCAvailable(): boolean {
  return !!(process.env.WONYA_TOKEN && process.env.WONYA_PARTNER_ID);
}

function getToken(): string {
  return process.env.WONYA_TOKEN || "";
}

function getPartnerId(): string {
  return process.env.WONYA_PARTNER_ID || "";
}

function getCallbackUrl(): string {
  return process.env.WONYA_CALLBACK_URL || "";
}

export function generateRefTransa(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 20; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function normalizeDRCPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("243") && digits.length === 12) digits = "0" + digits.slice(3);
  else if (digits.length === 9) digits = "0" + digits;
  if (/^0\d{9}$/.test(digits)) return digits;
  return null;
}

export interface WonyaInitResult {
  success: boolean;
  refTransa?: string;
  message?: string;
}

export async function initiateWonyaPayment(params: {
  amount: number;
  currency: "CDF" | "USD";
  phone: string;
  reason?: string;
}): Promise<WonyaInitResult> {
  if (!isDRCAvailable()) return { success: false, message: "DRC payments are not available." };
  const refTransa = generateRefTransa();
  try {
    const body: Record<string, unknown> = {
      RefPartenaire: getPartnerId(),
      RefTransa: refTransa,
      Montant: params.amount,
      Devise: params.currency,
      Action: "C2B",
      MobileMoney: params.phone,
      Motif: params.reason || "Geston Hosting payment",
    };
    const callbackUrl = getCallbackUrl();
    if (callbackUrl) body.CallbackUrl = callbackUrl;

    const res = await fetch(`${WONYA_BASE}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => null) as { success?: boolean; message?: string } | null;
    if (res.ok && data && data.success !== false) {
      return { success: true, refTransa };
    }
    return { success: false, message: (data && data.message) || "Failed to initiate payment" };
  } catch {
    return { success: false, message: "Payment service unavailable" };
  }
}

export interface WonyaStatusResult {
  success: boolean;
  status?: "pending" | "completed" | "failed";
  amount?: number;
}

export async function getWonyaPaymentStatus(refTransa: string): Promise<WonyaStatusResult> {
  try {
    const res = await fetch(`${WONYA_BASE}/transaction-status/status/${encodeURIComponent(refTransa)}`, {
      headers: { "Authorization": `Bearer ${getToken()}` },
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => null) as { success?: boolean; data?: { status?: string; amount?: number } } | null;
    if (!res.ok || !data || data.success === false || !data.data) return { success: false };
    const raw = (data.data.status || "").toLowerCase();
    const status: "pending" | "completed" | "failed" =
      raw === "completed" || raw === "success" || raw === "successful" ? "completed"
      : raw === "failed" || raw === "failure" || raw === "error" ? "failed"
      : "pending";
    return { success: true, status, amount: data.data.amount };
  } catch {
    return { success: false };
  }
}

export interface WonyaCallbackPayload {
  RefPartner?: string;
  RefPartenaire?: string;
  RefTransa?: string;
  Action?: string;
  StatutWonya?: string;
  StatusWonya?: string;
  StatutTransa?: string;
}

export function isWonyaCallbackSuccess(payload: WonyaCallbackPayload): boolean {
  const status = String(payload.StatusWonya || payload.StatutWonya || payload.StatutTransa || "").toLowerCase();
  return status.includes("success") || status.includes("reç") || status.includes("received") || status === "successes";
}
