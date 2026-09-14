import { User } from "../../models/User.js";
import { Bot } from "../../models/Bot.js";
import { Panel } from "../../models/Panel.js";
import { Transaction } from "../../models/Transaction.js";
import { logger } from "../../logger.js";

/** Hard ceiling per single owner command to limit blast radius if anything goes wrong. */
export const MAX_TX_PER_COMMAND = 50_000;

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function normalizeEmail(raw: string): string {
  return String(raw || "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

export function parsePositiveTxAmount(raw: string | number): number | null {
  const n = typeof raw === "number" ? raw : Number(String(raw || "").replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > MAX_TX_PER_COMMAND) return null;
  // Whole Coins only
  if (!Number.isInteger(n)) return null;
  return n;
}

export type OwnerOpResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Grant Coins to a user by email. Caller MUST already have verified owner identity.
 */
export async function ownerGrantTxByEmail(
  emailRaw: string,
  amountRaw: string | number,
  actorLabel: string
): Promise<OwnerOpResult> {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Invalid email. Use a full address like user@example.com" };
  }
  const amount = parsePositiveTxAmount(amountRaw);
  if (amount === null) {
    return {
      ok: false,
      error:
        "Invalid amount. Use a whole number from 1 to " +
        String(MAX_TX_PER_COMMAND) +
        " Coins.",
    };
  }

  const user = await User.findOne({ email });
  if (!user) {
    return { ok: false, error: "No account found for that email." };
  }

  user.txCoins = (user.txCoins || 0) + amount;
  await user.save();
  await Transaction.create({
    userId: user._id,
    type: "admin_grant",
    txAmount: amount,
    ksAmount: 0,
    status: "success",
    paystackRef: "owner_bot:" + actorLabel.slice(0, 40),
  });

  logger.info(
    { email, amount, actor: actorLabel, balance: user.txCoins },
    "Owner granted Coins via bot"
  );

  return {
    ok: true,
    message:
      "Granted " +
      String(amount) +
      " Coins to " +
      email +
      ".\nNew balance: " +
      String(user.txCoins) +
      " Coins",
  };
}

/**
 * Subtract Coins from a user by email. Caller MUST already have verified owner identity.
 */
export async function ownerSubtractTxByEmail(
  emailRaw: string,
  amountRaw: string | number,
  actorLabel: string
): Promise<OwnerOpResult> {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Invalid email. Use a full address like user@example.com" };
  }
  const amount = parsePositiveTxAmount(amountRaw);
  if (amount === null) {
    return {
      ok: false,
      error:
        "Invalid amount. Use a whole number from 1 to " +
        String(MAX_TX_PER_COMMAND) +
        " Coins.",
    };
  }

  const user = await User.findOne({ email });
  if (!user) {
    return { ok: false, error: "No account found for that email." };
  }

  const before = user.txCoins || 0;
  user.txCoins = Math.max(0, before - amount);
  await user.save();

  logger.info(
    { email, amount, actor: actorLabel, before, after: user.txCoins },
    "Owner subtracted Coins via bot"
  );

  return {
    ok: true,
    message:
      "Removed " +
      String(Math.min(amount, before)) +
      " Coins from " +
      email +
      ".\nNew balance: " +
      String(user.txCoins) +
      " Coins",
  };
}

export async function ownerLookupUserByEmail(emailRaw: string): Promise<OwnerOpResult> {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Invalid email." };
  }
  const user = await User.findOne({ email }).lean();
  if (!user) {
    return { ok: false, error: "No account found for that email." };
  }
  const [botCount, panelCount] = await Promise.all([
    Bot.countDocuments({ userId: user._id, status: { $ne: "deleted" } }),
    Panel.countDocuments({ userId: user._id }),
  ]);
  const u = user as {
    email?: string;
    username?: string;
    txCoins?: number;
    isBanned?: boolean;
    isModerator?: boolean;
    createdAt?: Date;
  };
  return {
    ok: true,
    message:
      "User " +
      String(u.email) +
      "\n" +
      "Username: " +
      (u.username || "—") +
      "\n" +
      "Coins: " +
      String(u.txCoins ?? 0) +
      "\n" +
      "Bots: " +
      String(botCount) +
      " · Panels: " +
      String(panelCount) +
      "\n" +
      "Banned: " +
      (u.isBanned ? "yes" : "no") +
      " · Moderator: " +
      (u.isModerator ? "yes" : "no") +
      "\n" +
      "Joined: " +
      (u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : "—"),
  };
}

export async function ownerPlatformStats(): Promise<string> {
  const [totalUsers, activeBots, totalBots, totalPanels, recentTx] = await Promise.all([
    User.countDocuments(),
    Bot.countDocuments({ status: "running" }),
    Bot.countDocuments({ status: { $ne: "deleted" } }),
    Panel.countDocuments(),
    Transaction.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      status: "success",
      type: "topup",
    }),
  ]);
  return (
    "Geston Host Stats\n\n" +
    "Users: " +
    String(totalUsers) +
    "\n" +
    "Active bots: " +
    String(activeBots) +
    "\n" +
    "Total bots: " +
    String(totalBots) +
    "\n" +
    "Panels: " +
    String(totalPanels) +
    "\n" +
    "Payments (24h): " +
    String(recentTx)
  );
}

/**
 * Parse owner free-text intents:
 *   add 10 tx to user@mail.com
 *   addtx user@mail.com 10
 *   remove 5 tx from user@mail.com
 *   user user@mail.com
 *   stats
 */
export function parseOwnerAdminIntent(text: string): {
  action: "grant" | "subtract" | "lookup" | "stats" | null;
  email?: string;
  amount?: string;
} {
  const t = String(text || "").trim();
  const lower = t.toLowerCase();

  if (/^(stats|statistics)$/i.test(lower)) {
    return { action: "stats" };
  }

  // /addtx email amount  OR  addtx email amount
  let m = t.match(/^(?:\/)?addtx\s+(\S+)\s+(\d+)\s*$/i);
  if (m) return { action: "grant", email: m[1], amount: m[2] };

  m = t.match(/^(?:\/)?(?:removetx|subtx)\s+(\S+)\s+(\d+)\s*$/i);
  if (m) return { action: "subtract", email: m[1], amount: m[2] };

  m = t.match(/^(?:\/)?user\s+(\S+)\s*$/i);
  if (m) return { action: "lookup", email: m[1] };

  // Natural language: add 10 tx to email@x.com
  m = t.match(
    /^(?:please\s+)?(?:add|grant|give)\s+(\d+)\s*(?:tx|coins?)?\s+(?:to\s+)?(\S+@\S+)\s*$/i
  );
  if (m) return { action: "grant", amount: m[1], email: m[2] };

  m = t.match(
    /^(?:please\s+)?(?:add|grant|give)\s+(\S+@\S+)\s+(\d+)\s*(?:tx|coins?)?\s*$/i
  );
  if (m) return { action: "grant", email: m[1], amount: m[2] };

  m = t.match(
    /^(?:please\s+)?(?:remove|subtract|deduct|take)\s+(\d+)\s*(?:tx|coins?)?\s+(?:from\s+)?(\S+@\S+)\s*$/i
  );
  if (m) return { action: "subtract", amount: m[1], email: m[2] };

  m = t.match(/^(?:please\s+)?(?:lookup|find|check)\s+(?:user\s+)?(\S+@\S+)\s*$/i);
  if (m) return { action: "lookup", email: m[1] };

  return { action: null };
}

export async function runOwnerAdminIntent(
  text: string,
  actorLabel: string
): Promise<OwnerOpResult | null> {
  const intent = parseOwnerAdminIntent(text);
  if (!intent.action) return null;

  if (intent.action === "stats") {
    return { ok: true, message: await ownerPlatformStats() };
  }
  if (intent.action === "grant") {
    return ownerGrantTxByEmail(intent.email || "", intent.amount || "", actorLabel);
  }
  if (intent.action === "subtract") {
    return ownerSubtractTxByEmail(intent.email || "", intent.amount || "", actorLabel);
  }
  if (intent.action === "lookup") {
    return ownerLookupUserByEmail(intent.email || "");
  }
  return null;
}
