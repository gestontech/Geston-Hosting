import crypto from "crypto";

const FAPSHI_BASE = "https://live.fapshi.com";

export function isCameroonAvailable(): boolean {
  return !!(process.env.FAPSHI_API_USER && process.env.FAPSHI_API_KEY);
}

function getFapshiHeaders(): Record<string, string> {
  return {
    "apiuser": process.env.FAPSHI_API_USER || "",
    "apikey": process.env.FAPSHI_API_KEY || "",
    "Content-Type": "application/json"
  };
}

export interface FapshiInitResult {
  success: boolean;
  paymentUrl?: string;
  transId?: string;
  message?: string;
}

export async function initiateFapshiPayment(params: {
  amount: number;
  externalId: string;
  redirectUrl?: string;
  message?: string;
}): Promise<FapshiInitResult> {
  try {
    const res = await fetch(`${FAPSHI_BASE}/initiate-pay`, {
      method: "POST",
      headers: getFapshiHeaders(),
      body: JSON.stringify({
        amount: params.amount,
        externalId: params.externalId,
        redirectUrl: params.redirectUrl || "",
        message: params.message || "GESTONX Top-up"
      })
    });
    const data = await res.json() as { status?: number; link?: string; transId?: string; message?: string };
    if (data.link) {
      return { success: true, paymentUrl: data.link, transId: data.transId };
    }
    return { success: false, message: (data.message as string) || "Failed to initiate payment" };
  } catch {
    return { success: false, message: "Payment service unavailable" };
  }
}

export interface FapshiDirectPayResult extends FapshiInitResult {
  directPayUnavailable?: boolean;
}

export async function initiateFapshiDirectPay(params: {
  amount: number;
  phone: string;
  name?: string;
  email?: string;
  externalId: string;
  message?: string;
}): Promise<FapshiDirectPayResult> {
  try {
    const res = await fetch(`${FAPSHI_BASE}/direct-pay`, {
      method: "POST",
      headers: getFapshiHeaders(),
      body: JSON.stringify({
        amount: params.amount,
        phone: params.phone,
        name: params.name || "",
        email: params.email || "",
        externalId: params.externalId,
        message: params.message || "GESTONX Top-up"
      })
    });
    let data: { transId?: string; message?: string } = {};
    try {
      data = await res.json() as { transId?: string; message?: string };
    } catch {
      data = {};
    }
    if (data.transId) {
      return { success: true, transId: data.transId, message: data.message };
    }
    const message = data.message || "Failed to initiate payment";
    const directPayUnavailable = res.status === 403 || /forbidden|activate direct ?pay/i.test(message);
    return { success: false, message, directPayUnavailable };
  } catch {
    return { success: false, message: "Payment service unavailable" };
  }
}

export interface FapshiStatusResult {
  success: boolean;
  status?: "SUCCESSFUL" | "PENDING" | "FAILED" | "EXPIRED";
  amount?: number;
  message?: string;
}

export async function getFapshiPaymentStatus(transId: string): Promise<FapshiStatusResult> {
  try {
    const res = await fetch(`${FAPSHI_BASE}/payment-status/${encodeURIComponent(transId)}`, {
      method: "GET",
      headers: getFapshiHeaders()
    });
    const data = await res.json() as { paymentStatus?: string; amount?: number; message?: string };
    if (data.paymentStatus) {
      return {
        success: true,
        status: data.paymentStatus as "SUCCESSFUL" | "PENDING" | "FAILED" | "EXPIRED",
        amount: data.amount
      };
    }
    return { success: false, message: (data.message as string) || "Status check failed" };
  } catch {
    return { success: false, message: "Payment service unavailable" };
  }
}

export function verifyFapshiWebhook(body: string, signature: string): boolean {
  const secret = process.env.FAPSHI_API_KEY || "";
  if (!secret) return false;
  const hash = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return hash === signature;
}
