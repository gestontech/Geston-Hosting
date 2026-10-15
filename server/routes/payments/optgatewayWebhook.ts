import { Request, Response } from "express";
import { verifyOPTWebhookSignature } from "../../services/optgateway.js";
import { Transaction } from "../../models/Transaction.js";
import { User } from "../../models/User.js";

export async function optGatewayWebhookHandler(req: Request, res: Response) {
  const raw = String((req as any).rawBody || "");
  const sig = String(req.headers["optgateway-signature"] || req.headers["opt-gateway-signature"] || req.headers["opgateway-signature"] || "");

  if (!verifyOPTWebhookSignature(raw, sig)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event: any = req.body || {};
  const type = String(event.type || event.event || "");
  const data = event.data || event.object || event.payment || {};
  const reference = String(data.reference || data.metadata?.reference || "");
  if (!reference) return res.status(200).json({ received: true });

  const failed = [
    "payment.failed",
    "payment.cancelled",
    "checkout.session.expired",
    "checkout.session.cancelled",
  ].includes(type) || data.status === "failed" || data.status === "cancelled" || data.status === "expired";

  const succeeded = ["checkout.session.completed", "payment.succeeded"].includes(type)
    || data.status === "succeeded"
    || data.status === "completed";

  if (!failed && !succeeded) return res.status(200).json({ received: true });

  const tx = await Transaction.findOne({ reference, provider: "optgateway" });
  if (!tx || tx.status !== "pending") return res.status(200).json({ received: true });

  if (failed) {
    await Transaction.updateOne({ _id: tx._id, status: "pending" }, { $set: { status: "failed" } });
    return res.status(200).json({ received: true });
  }

  const webhookAmount = Number(data.amount);
  const webhookCurrency = String(data.currency || "").toUpperCase();
  if (!Number.isFinite(webhookAmount) || webhookAmount !== Number(tx.paymentAmount) || webhookCurrency !== String(tx.currency || "USD").toUpperCase()) {
    console.error("[OPT] webhook amount/currency mismatch", { reference, webhookAmount, webhookCurrency, expectedAmount: tx.paymentAmount, expectedCurrency: tx.currency });
    return res.status(400).json({ error: "Payment mismatch" });
  }

  const updated = await Transaction.findOneAndUpdate(
    { _id: tx._id, status: "pending" },
    { $set: { status: "success" } },
    { new: true },
  );

  if (updated) {
    await User.updateOne({ _id: updated.userId }, { $inc: { txCoins: updated.txAmount } });
  }

  return res.status(200).json({ received: true });
}
