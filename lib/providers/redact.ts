const SECRET_KEY =
  /^(password|passwd|secret|token|authorization|api[_-]?key|merchant[_-]?key|sign_string|click_sign|hash)$/i;

const SECRET_VALUE = /(bearer\s+\S+)|((api|secret|password|token)[=:]\s*\S+)/i;

function redactValue(key: string, value: unknown): unknown {
  if (SECRET_KEY.test(key)) return "[redacted]";
  if (typeof value === "string" && SECRET_VALUE.test(value)) return "[redacted]";
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return redactProviderPayload(value as Record<string, unknown>);
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      item && typeof item === "object"
        ? redactProviderPayload(item as Record<string, unknown>)
        : item,
    );
  }
  return value;
}

/** Provider javobini log/DB ga yozishdan oldin secretlarni olib tashlash. */
export function redactProviderPayload(
  input: unknown,
): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    out[key] = redactValue(key, value);
  }
  return out;
}
