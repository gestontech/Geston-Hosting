export function normalizeTanzaniaPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("255") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "255" + digits.slice(1);
  if (digits.length === 9) return "255" + digits;
  return digits;
}

export function isValidTanzaniaPhone(value: string): boolean {
  return /^255[67]\d{8}$/.test(normalizeTanzaniaPhone(value));
}

export function normalizeDRCPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("243") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "243" + digits.slice(1);
  if (digits.length === 9) return "243" + digits;
  return digits;
}

export function isValidDRCPhone(value: string): boolean {
  return /^243[89]\d{8}$/.test(normalizeDRCPhone(value));
}

export function isValidKenyanPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return /^254[17]\d{8}$/.test(digits);
  if (digits.startsWith("0") && digits.length === 10) return /^0[17]\d{8}$/.test(digits);
  if (digits.length === 9) return /^[17]\d{8}$/.test(digits);
  return false;
}

export function toPaystackPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.length === 9) return "254" + digits;
  return digits;
}
