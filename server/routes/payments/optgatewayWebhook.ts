import { Router, type Request, type Response } from "express";
import { Transaction } from "../../models/Transaction.js";
import { User } from "../../models/User.js";
import { createNotification } from "../../services/notifications.js";
import { notifyOwner } from "../../services/notify.js";
import { verifyOPTWebhookSignature } from "../../services/optgateway.js";

const router = Router();

type OPTEvent = {
  id?: string;
  type?: string;
  data?: {
    id?: string;
    reference?: string;
    status?: string;
    amount?: string | number;
    currency?: string;
  };
};

router.post("/webhook/optgateway", async (req: Request, res: Response) => {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const secret = process.env.OPTGATEWAY_WEBHOOK_SECRET || "";
  const signature = req.get("OPTGateway-Signature") || "";

  if (!rawBody || !verifyOPTWebhookSignature(rawBody, signature, secret)) {
    res.sendStatus(400);
    return;
  }

  let event: OPTEvent;
  try {
    event = JSON.parse(rawBody.toString("utf8")) as OPTEvent;
  } catch {
    res.sendStatus(400);
    return;
  }

  if (event.type !== "checkout.session.completed" && event.type !== "payment.succeeded") {
    res.sendStatus(200);
    return;
  }

  const reference = String(event.data?.reference || "");
  if (!reference) {
    res.sendStatus(200);
    return;
  }

  const tx = await Transaction.findOneAndUpdate(
    {
      paystackRef: reference,
      paystackCountry: "drc",
      status: "pending",
      type: "topup",
    },
    { $set: { status: "success" } },
    { new: true }
  );

  if (!tx) {
    res.sendStatus(200);
    return;
  }

  const user = await User.findById(tx.userId);
  if (user) {
    user.txCoins += tx.txAmount;
    await user.save();

    notifyOwner(
      `OPT payment confirmed: ${tx.txAmount} Coins for ${user.email || user._id}`
    ).catch(() => {});

    createNotification(
      user._id,
      "payment_success",
      "Paiement confirmé",
      `${tx.txAmount} Coins ont été ajoutés à votre compte.`
    ).catch(() => {});
  }

  res.sendStatus(200);
});

export default router;
