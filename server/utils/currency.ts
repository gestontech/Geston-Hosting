export interface CurrencyDef {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  perKes: number;
}

export const CURRENCIES: CurrencyDef[] = [
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪", perKes: 1 },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", perKes: 0.00773 },
  { code: "CDF", name: "Congolese Franc", symbol: "FC", flag: "🇨🇩", perKes: 17.70 },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", perKes: 0.00712 },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", perKes: 0.00610 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", perKes: 12.10 },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", flag: "🇹🇿", perKes: 19.90 },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", flag: "🇺🇬", perKes: 28.30 },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", flag: "🇬🇭", perKes: 0.1085 },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", perKes: 0.1390 },
  { code: "RWF", name: "Rwandan Franc", symbol: "RF", flag: "🇷🇼", perKes: 10.75 },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", flag: "🇿🇲", perKes: 0.1810 },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", flag: "🌍", perKes: 4.65 },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA", flag: "🌍", perKes: 4.65 },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", flag: "🇪🇬", perKes: 0.378 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", perKes: 0.680 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦", perKes: 0.01065 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", perKes: 0.01180 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", perKes: 0.02840 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳", perKes: 0.0557 },
  { code: "MWK", name: "Malawian Kwacha", symbol: "MK", flag: "🇲🇼", perKes: 13.40 },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br", flag: "🇪🇹", perKes: 0.965 },
];

export const CURRENCY_MAP: Record<string, CurrencyDef> = Object.fromEntries(
  CURRENCIES.map(c => [c.code, c])
);

export function isValidCurrency(code: string): boolean {
  return !!CURRENCY_MAP[(code || "").toUpperCase()];
}

export function convertFromKes(amountKes: number, code: string): number {
  const def = CURRENCY_MAP[(code || "KES").toUpperCase()] || CURRENCY_MAP.KES;
  return amountKes * def.perKes;
}

export function convertToKes(amount: number, code: string): number {
  const def = CURRENCY_MAP[(code || "KES").toUpperCase()] || CURRENCY_MAP.KES;
  return def.perKes === 0 ? 0 : amount / def.perKes;
}
