const SPEEDPESA_BASE = "https://speedpesa.com/api/v1";

export function isTanzaniaAvailable(): boolean {
  return !!process.env.SPEEDPESA_API_KEY;
}

function getHeaders(): Record<string, string> {
  return {
    "x-api-key": process.env.SPEEDPESA_API_KEY || "",
    "Content-Type": "application/json"
  };
}

export interface SpeedPesaInitResult {
  success: boolean;
  reference?: string;
  message?: string;
}

export async function initiateSpeedPesaPayment(params: {
  phonenumber: string;
  amount: number;
}): Promise<SpeedPesaInitResult> {
  try {
    const res = await fetch(`${SPEEDPESA_BASE}/mobilepayin`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ phonenumber: params.phonenumber, amount: String(params.amount) })
    });
    const data = await res.json() as { type?: string; message?: string; data?: { reference?: string } };
    if (data.type === "success" && data.data?.reference) {
      return { success: true, reference: data.data.reference };
    }
    return { success: false, message: data.message || "Failed to initiate payment" };
  } catch {
    return { success: false, message: "Payment service unavailable" };
  }
}

export interface SpeedPesaStatusResult {
  success: boolean;
  status?: "SUCCESS" | "PENDING" | "FAILED";
  message?: string;
}

export async function getSpeedPesaPaymentStatus(reference: string): Promise<SpeedPesaStatusResult> {
  try {
    const res = await fetch(`${SPEEDPESA_BASE}/status`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ reference })
    });
    const data = await res.json() as { type?: string; message?: string; data?: { status?: string } };
    if (data.data?.status) {
      return { success: true, status: data.data.status as "SUCCESS" | "PENDING" | "FAILED" };
    }
    return { success: false, message: data.message || "Status check failed" };
  } catch {
    return { success: false, message: "Payment service unavailable" };
  }
}
