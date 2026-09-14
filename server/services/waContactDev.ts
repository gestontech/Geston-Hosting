export function getDevWaDigits(): string {
  return String(process.env.DEV_WA_NUMBER || "").replace(/\D/g, "");
}

export function developerWaMeUrl(): string {
  const digits = getDevWaDigits();
  if (!digits) return "";
  return "https://wa.me/" + digits;
}

export function contactDeveloperText(): string {
  const url = developerWaMeUrl();
  if (!url) {
    return "Developer contact is not configured yet. Please try the website support page.";
  }
  return (
    "Need help from the developer?\n\n" +
    "Tap the button below to open a WhatsApp chat, or use this link:\n" +
    url
  );
}

export function isContactDeveloperIntent(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === "owner" ||
    t === "developer" ||
    t === "dev" ||
    t === "contact" ||
    t === "contact developer" ||
    t === "contact owner" ||
    t === "support" ||
    t === "menu_contact" ||
    t.includes("contact developer") ||
    t.includes("talk to owner")
  );
}
