export type BoostStatus =
  | "awaiting_payment"
  | "pending"
  | "processing"
  | "completed"
  | "partial"
  | "failed"
  | "refunded";

export function normalizeBoostStatus(raw: string | undefined | null, fallback: BoostStatus = "pending"): BoostStatus {
  if (!raw) return fallback;
  const s = String(raw).trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (["completed", "complete", "success", "successful", "done", "finished"].includes(s)) return "completed";
  if (["partial", "partiallycompleted", "partialcomplete"].includes(s)) return "partial";
  if (["processing", "inprogress", "inprocess", "progress", "running", "active"].includes(s)) return "processing";
  if (["pending", "queued", "queue", "waiting", "awaiting"].includes(s)) return "pending";
  if (["failed", "fail", "error", "canceled", "cancelled", "rejected"].includes(s)) return "failed";
  if (["refunded", "refund"].includes(s)) return "refunded";
  if (["awaitingpayment", "unpaid"].includes(s)) return "awaiting_payment";
  return fallback;
}

export function isTerminalBoostStatus(status: string): boolean {
  const n = normalizeBoostStatus(status);
  return n === "completed" || n === "failed" || n === "refunded";
}

export function countsAsCompleted(status: string): boolean {
  const n = normalizeBoostStatus(status);
  return n === "completed" || n === "partial";
}
