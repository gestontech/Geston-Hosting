import { User } from "../../models/User.js";
import { Bot } from "../../models/Bot.js";
import { Panel } from "../../models/Panel.js";
import { logger } from "../../logger.js";

export type OwnerOpResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const EMAIL_RE =
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function normalizeEmail(raw: string): string {
  return String(raw || "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

/**
 * Look up a user without exposing financial or Coins information.
 */
export async function ownerLookupUserByEmail(
  emailRaw: string
): Promise<OwnerOpResult> {
  const email = normalizeEmail(emailRaw);

  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: "Invalid email.",
    };
  }

  const user = await User.findOne({ email }).lean();

  if (!user) {
    return {
      ok: false,
      error: "No account found for that email.",
    };
  }

  const [botCount, panelCount] = await Promise.all([
    Bot.countDocuments({
      userId: user._id,
      status: { $ne: "deleted" },
    }),
    Panel.countDocuments({
      userId: user._id,
    }),
  ]);

  const u = user as {
    email?: string;
    username?: string;
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
      (u.createdAt
        ? new Date(u.createdAt)
            .toISOString()
            .slice(0, 10)
        : "—"),
  };
}

export async function ownerPlatformStats(): Promise<string> {
  const [
    totalUsers,
    activeBots,
    totalBots,
    totalPanels,
  ] = await Promise.all([
    User.countDocuments(),
    Bot.countDocuments({
      status: "running",
    }),
    Bot.countDocuments({
      status: { $ne: "deleted" },
    }),
    Panel.countDocuments(),
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
    "Mode: Free"
  );
}

/**
 * Parse owner free-text administrative intents.
 *
 * Supported:
 *   user user@mail.com
 *   lookup user@mail.com
 *   stats
 *
 * Financial/Coins commands are intentionally no longer supported.
 */
export function parseOwnerAdminIntent(text: string): {
  action: "lookup" | "stats" | null;
  email?: string;
} {
  const t = String(text || "").trim();
  const lower = t.toLowerCase();

  if (/^(stats|statistics)$/i.test(lower)) {
    return {
      action: "stats",
    };
  }

  let m = t.match(
    /^(?:\/)?user\s+(\S+)\s*$/i
  );

  if (m) {
    return {
      action: "lookup",
      email: m[1],
    };
  }

  m = t.match(
    /^(?:please\s+)?(?:lookup|find|check)\s+(?:user\s+)?(\S+@\S+)\s*$/i
  );

  if (m) {
    return {
      action: "lookup",
      email: m[1],
    };
  }

  return {
    action: null,
  };
}

export async function runOwnerAdminIntent(
  text: string,
  _actorLabel: string
): Promise<OwnerOpResult | null> {
  const intent = parseOwnerAdminIntent(text);

  if (!intent.action) {
    return null;
  }

  if (intent.action === "stats") {
    return {
      ok: true,
      message: await ownerPlatformStats(),
    };
  }

  if (intent.action === "lookup") {
    return ownerLookupUserByEmail(
      intent.email || ""
    );
  }

  logger.info(
    "Owner admin intent processed in free mode"
  );

  return null;
}
