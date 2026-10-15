import crypto from "node:crypto";

const OPT_BASE_URL = process.env.OPTGATEWAY_BASE_URL || "https://pay.optsolution.pro";
const OPT_KEY = process.env.OPTGATEWAY_KEY || "";

export type OPTCurrency = "USD" | "CDF";
export type OPTMethod = "illicocash" | "mobile_money" | "card" | "pepele";

export function isOPTGatewayAvailable(): boolean {
  return Boolean(OPT_KEY);
}

export function generateOPTReference(): string {
  return `GST-${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;
}

export async function createOPTCheckoutSession(params: {
  amount: number;
  currency: OPTCurrency;
  reference: string;
  returnUrl: string;
  cancelUrl?: string;
  description: string;
  phone?: string;
}) {
  if (!OPT_KEY) {
    return { success: false as const, message: "OPTGateway is not configured." };
  }

  const body: Record<string, unknown> = {
    amount: params.amount.toFixed(2),
    currency: params.currency,
    reference: params.reference,
    description: params.description,
    methods: ["illicocash", "mobile_money", "card", "pepele"] satisfies OPTMethod[],
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    expires_in_minutes: 60,
  };

  if (params.phone) {
    body.customer = { phone: params.phone };
  }

  const response = await fetch(`${OPT_BASE_URL}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPT_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `OPTGateway error (${response.status})`;
    return { success: false as const, message };
  }

  if (!data?.id || !data?.url) {
    return { success: false as const, message: "OPTGateway returned an invalid checkout session." };
  }

  return {
    success: true as const,
    id: String(data.id),
    url: String(data.url),
    reference: String(data.reference || params.reference),
    status: String(data.status || "open"),
  };
}

export function verifyOPTWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key, rest.join("=")];
    })
  );

  const timestamp = Number(parts.t);
  const signature = parts.v1 || "";

  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
}
