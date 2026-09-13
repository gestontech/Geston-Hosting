/**
 * Coins Retrieval — restore full paid Coins for active paid bots after a platform disruption.
 * Free trials skipped. Confirmed via transaction history (deploy/renew success).
 * Idempotent via Bot.refunded + Transaction.paystackRef.
 */
import mongoose from "mongoose";
import { Bot } from "../models/Bot.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { createNotification } from "./notifications.js";
import { sendOutageRefundEmail } from "./email.js";
import { logger } from "../logger.js";
import { getSiteUrl } from "../lib/siteUrl.js";

const KSH_PER_TX = Number(process.env.KSH_PER_TX || "10");
const REF_PREFIX = "tx-retrieval-bot-";

export type OutageRefundLine = {
  kind: "bot";
  id: string;
  userId: string;
  email: string;
  label: string;
  cost: number;
  refundTx: number;
  remainingDays: number;
  totalDays: number;
  expiresAt: string | null;
};

export type OutageRefundResult = {
  dryRun: boolean;
  botsConsidered: number;
  panelsConsidered: number;
  lines: OutageRefundLine[];
  totalTx: number;
  usersAffected: number;
  refunded: number;
  emailed: number;
  errors: string[];
};

async function userHasPaidHosting(userId: string): Promise<boolean> {
  const paid = await Transaction.findOne({
    userId,
    type: { $in: ["deploy", "renew"] },
    status: "success",
    txAmount: { $gt: 0 },
  })
    .select("_id")
    .lean();
  return !!paid;
}

export async function previewOutageRefunds(_includePanels = false): Promise<OutageRefundResult> {
  return runTxRetrieval({ dryRun: true });
}

export async function executeOutageRefunds(_includePanels = false): Promise<OutageRefundResult> {
  return runTxRetrieval({ dryRun: false });
}

async function runTxRetrieval(opts: { dryRun: boolean }): Promise<OutageRefundResult> {
  const now = new Date();
  const result: OutageRefundResult = {
    dryRun: opts.dryRun,
    botsConsidered: 0,
    panelsConsidered: 0,
    lines: [],
    totalTx: 0,
    usersAffected: 0,
    refunded: 0,
    emailed: 0,
    errors: [],
  };

  // Paid bots still within their month — full cost credit (not prorated)
  const bots = await Bot.find({
    isTrial: { $ne: true },
    refunded: { $ne: true },
    cost: { $gt: 0 },
    expiresAt: { $gt: now },
    status: { $in: ["building", "running", "stopped", "failed"] },
  }).lean();

  result.botsConsidered = bots.length;

  type Acc = {
    email: string;
    userId: string;
    totalTx: number;
    items: Array<{ kind: string; label: string; refundTx: number; remainingDays: number }>;
  };
  const byUser = new Map<string, Acc>();
  const paidCache = new Map<string, boolean>();

  for (const bot of bots) {
    const userId = String(bot.userId);
    const refundTx = Math.max(0, Math.round(bot.cost || 0));
    if (refundTx <= 0) continue;

    let isPaid = paidCache.get(userId);
    if (isPaid === undefined) {
      isPaid = await userHasPaidHosting(userId);
      paidCache.set(userId, isPaid);
    }
    if (!isPaid) continue;

    const remainingDays = Math.max(
      0,
      Math.round(((new Date(bot.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) * 10) / 10
    );

    let user = byUser.get(userId);
    if (!user) {
      const u = await User.findById(userId).select("email").lean();
      if (!u?.email) {
        result.errors.push("No email for user " + userId + " bot " + bot.herokuAppName);
        continue;
      }
      user = { email: u.email, userId, totalTx: 0, items: [] };
      byUser.set(userId, user);
    }

    const line: OutageRefundLine = {
      kind: "bot",
      id: String(bot._id),
      userId,
      email: user.email,
      label: bot.herokuAppName || bot.templateName || "bot",
      cost: bot.cost || 0,
      refundTx,
      remainingDays,
      totalDays: 30,
      expiresAt: new Date(bot.expiresAt).toISOString(),
    };
    result.lines.push(line);
    user.totalTx += refundTx;
    user.items.push({
      kind: "bot",
      label: line.label,
      refundTx,
      remainingDays,
    });

    if (!opts.dryRun) {
      try {
        const updated = await Bot.findOneAndUpdate(
          { _id: bot._id, refunded: { $ne: true } },
          { refunded: true, status: "deleted" },
          { new: true }
        );
        if (!updated) continue;

        await User.findByIdAndUpdate(userId, { $inc: { txCoins: refundTx } });
        await Transaction.create({
          userId: new mongoose.Types.ObjectId(userId),
          type: "refund",
          txAmount: refundTx,
          ksAmount: refundTx * KSH_PER_TX,
          status: "success",
          paystackRef: REF_PREFIX + String(bot._id),
        });
        await createNotification(
          userId,
          "refund",
          "Coins restored — please redeploy",
          `A brief platform issue affected active bots. Your bot "${line.label}" is no longer online. ${refundTx} Coins has been credited so you can deploy again.`
        ).catch(() => {});
        result.refunded += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push("bot " + line.label + ": " + msg);
        logger.warn({ err, botId: bot._id }, "tx retrieval bot credit failed");
      }
    }
  }

  result.totalTx = result.lines.reduce((s, l) => s + l.refundTx, 0);
  result.usersAffected = byUser.size;

  if (!opts.dryRun) {
    const site = getSiteUrl();
    for (const [, acc] of byUser) {
      if (acc.totalTx <= 0) continue;
      try {
        await sendOutageRefundEmail({
          to: acc.email,
          totalTx: acc.totalTx,
          items: acc.items,
          siteUrl: site,
        });
        result.emailed += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push("email " + acc.email + ": " + msg);
        logger.warn({ err, email: acc.email }, "tx retrieval email failed");
      }
    }
  }

  return result;
}
