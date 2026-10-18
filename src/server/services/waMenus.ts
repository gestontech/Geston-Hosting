import { PanelPlan } from "../models/PanelPlan.js";
import { isServiceDisabled } from "../lib/featureFlags.js";
import { getSiteUrl, getPanelShopUrl } from "../lib/siteUrl.js";
import { buildBoostPlatformIntro } from "./boostMenus.js";

const KSH_PER_TX = Number(process.env.KSH_PER_TX || "10");

export type MenuButton = { id: string; text: string };

export function userMenuButtons(): MenuButton[] {
  return [
    { id: "menu_plans", text: "Plans" },
    { id: "menu_buy", text: "Buy Panel" },
    { id: "menu_boost", text: "Boosting" },
    { id: "menu_contact", text: "Contact Developer" },
    { id: "menu_help", text: "Help" },
  ];
}

export function adminMenuButtons(): MenuButton[] {
  return [
    { id: "menu_plans", text: "Plans" },
    { id: "menu_buy", text: "Buy Panel" },
    { id: "menu_boost", text: "Boosting" },
    { id: "menu_stats", text: "Stats" },
    { id: "menu_flags", text: "Flags" },
    { id: "menu_contact", text: "Contact Developer" },
    { id: "menu_help", text: "Help" },
  ];
}

export function menuIntroText(isAdmin: boolean): string {
  const askAnything =
    "\n\nLooking for something else? Just ask — you can message anything outside this menu.";

  if (isAdmin) {
    return (
      "GESTONX — Admin menu\n\n" +
      "Reply with a number or type a command.\n" +
      "Admin extras: flags, disable, enable" +
      askAnything
    );
  }
  return (
    "GESTONX\n\n" +
    "Reply with a number or type:\n" +
    "plans · buy · boost · help · contact" +
    askAnything
  );
}

export async function buildPlansText(): Promise<string> {
  const SITE_URL = getSiteUrl();
  if (await isServiceDisabled("panels")) {
    return "Panel shop is temporarily disabled.\n\nShop: " + SITE_URL;
  }
  try {
    const plans = await PanelPlan.find({ active: true }).sort({ order: 1 }).lean();
    if (plans.length === 0) {
      return "No active plans right now.\n\nShop: " + SITE_URL;
    }
    const lines: string[] = ["Panel Plans (live prices)", ""];
    for (const p of plans) {
      const kes = p.txCost * KSH_PER_TX;
      lines.push(p.name);
      if (p.ram) {
        lines.push("  RAM " + String(p.ram) + " · Disk " + String(p.disk) + " · CPU " + String(p.cpu));
      }
      lines.push("  " + String(kes) + " KSH (" + String(p.txCost) + " Coins)");
      lines.push("");
    }
    lines.push("Buy: " + getPanelShopUrl());
    return lines.join("\n");
  } catch {
    return "Failed to load plans.\n\nShop: " + SITE_URL;
  }
}

export async function buildBoostText(): Promise<string> {
  return buildBoostPlatformIntro();
}

export function mapMenuButtonId(idOrText: string): string | null {
  const t = idOrText.trim().toLowerCase();

  // Numbered text-only menus (matches userMenuButtons order for 1–5)
  if (t === "1") return "plans";
  if (t === "2") return "buy";
  if (t === "3") return "boost";
  if (t === "4") return "contact";
  if (t === "5") return "menu";
  // Admin-only extras by name (or type stats / flags)
  if (t === "6") return "contact";
  if (t === "7") return "menu";

  if (t === "menu_plans" || t === "plans" || t === "plan" || t === "pricing") return "plans";
  if (t === "menu_buy" || t === "buy" || t === "buy panel" || t === "panel") return "buy";
  if (t === "menu_boost" || t === "boost" || t === "boosting") return "boost";
  if (t === "menu_stats" || t === "stats" || t === "stat" || t === "status") return "stats";
  if (t === "menu_help" || t === "help" || t === "menu" || t === "start") return "menu";
  if (t === "menu_flags" || t === "flags") return "flags";
  if (
    t === "menu_contact" ||
    t === "contact" ||
    t === "owner" ||
    t === "developer" ||
    t === "support"
  ) {
    return "contact";
  }
  return null;
}
