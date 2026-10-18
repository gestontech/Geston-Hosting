import type { Request, Response, NextFunction } from "express";
import { Transaction } from "../../models/Transaction.js";
import { User } from "../../models/User.js";
import {
  verifyWebhookSignature,
  verifyWebhookSignatureNg,
} from "../../services/paystack.js";
import {
  isWonyaCallbackSuccess,
  type WonyaCallbackPayload,
} from "../../services/wonyapay.js";
import { notifyOwner } from "../../services/notify.js";
import { createNotification } from "../../services/notifications.js";

export async function paystackWebhookHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = Array.isArray(req.headers["x-paystack-signature"])
      ? req.headers["x-paystack-signature"][0]
      : req.headers["x-paystack-signature"] || "";
    if (!signature) { res.status(400).json({ error: "Missing signature" }); return; }
    const body = JSON.stringify(req.body);

    const isValidKenya = verifyWebhookSignature(body, signature);
    const isValidNigeria = !isValidKenya && verifyWebhookSignatureNg(body, signature);

    if (!isValidKenya && !isValidNigeria) { res.status(400).json({ error: "Invalid signature" }); return; }

    const country: "kenya" | "nigeria" = isValidNigeria ? "nigeria" : "kenya";
    const currencyLabel = country === "nigeria" ? "NGN" : "KES";

    const event = req.body;
    if (event.event === "charge.success") {
      const reference = event.data.reference as string;
      const tx = await Transaction.findOne({ paystackRef: reference });
      if (tx && tx.status === "pending") {
        tx.status = "success";
        await tx.save();
        const user = await User.findById(tx.userId);
        if (user) {
          user.txCoins += tx.txAmount;
          await user.save();
          notifyOwner(`💰 *Payment Confirmed (Webhook)*\n\nUser: \`${user.email}\`\nAmount: ${tx.txAmount} Coins (${currencyLabel} ${tx.ksAmount})\nCountry: ${country === "nigeria" ? "🇳🇬 Nigeria" : "🇰🇪 Kenya"}\nRef: \`${reference}\``).catch(() => {});
          createNotification(user._id, "topup", "Top up successful", `You topped up ${tx.txAmount} Coins (${currencyLabel} ${tx.ksAmount}).`).catch(() => {});
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

export async function speedpesaWebhookHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as { reference?: string; event?: string; status?: string };
    if (body.event === "PAYIN" && body.status === "SUCCESS" && body.reference) {
      const tx = await Transaction.findOne({ paystackRef: body.reference, paystackCountry: "tanzania" });
      if (tx && tx.status === "pending") {
        tx.status = "success";
        await tx.save();
        const user = await User.findById(tx.userId);
        if (user) {
          user.txCoins += tx.txAmount;
          await user.save();
          notifyOwner(`💰 *Tanzania Payment Confirmed (Webhook)*\n\nUser: \`${user.email}\`\nAmount: ${tx.txAmount} Coins (TZS ${tx.ksAmount})\nRef: \`${body.reference}\``).catch(() => {});
          createNotification(user._id, "topup", "Top up successful", `You topped up ${tx.txAmount} Coins (TZS ${tx.ksAmount}).`).catch(() => {});
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

export async function wonyaWebhookHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as WonyaCallbackPayload;
    const refTransa = body.RefTransa;
    if (refTransa && isWonyaCallbackSuccess(body)) {
      const tx = await Transaction.findOne({ paystackRef: refTransa, paystackCountry: "drc" });
      if (tx && tx.status === "pending") {
        tx.status = "success";
        await tx.save();
        const user = await User.findById(tx.userId);
        if (user) {
          user.txCoins += tx.txAmount;
          await user.save();
          notifyOwner(`💰 *DRC Payment Confirmed (Webhook)*\n\nUser: \`${user.email}\`\nAmount: ${tx.txAmount} Coins\nRef: \`${refTransa}\``).catch(() => {});
          createNotification(user._id, "topup", "Top up successful", `You topped up ${tx.txAmount} Coins.`).catch(() => {});
        }
      }
    }
    res.status(200).json({ received: true });
  } catch {
    res.status(200).json({ received: true });
  }
}
