/** Telefon raqamini +998XXXXXXXXX formatiga keltiradi */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 9) {
    return `+998${digits}`;
  }

  if (digits.startsWith("998")) {
    return `+${digits}`;
  }

  return digits.startsWith("+") ? digits : `+${digits}`;
}

/** SMS provayderlari uchun: 998901234567 */
export function toSmsPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidUzPhone(phone: string): boolean {
  const digits = toSmsPhone(phone);
  return /^998\d{9}$/.test(digits);
}
