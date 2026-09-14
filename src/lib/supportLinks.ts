function digitsOnly(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

export function supportWhatsAppUrl(): string {
  const digits = digitsOnly(
    String(import.meta.env.VITE_DEV_WA_NUMBER || import.meta.env.VITE_WA_BOT_NUMBER || "")
  );
  if (!digits) return "";
  return "https://wa.me/" + digits;
}
