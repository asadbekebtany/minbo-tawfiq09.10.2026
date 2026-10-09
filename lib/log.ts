export type LogFields = Record<string, string | number | boolean | null | undefined>;

function line(level: "info" | "warn" | "error", scope: string, message: string, fields?: LogFields) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...fields,
  };
  const text = JSON.stringify(payload);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export const log = {
  info: (scope: string, message: string, fields?: LogFields) => line("info", scope, message, fields),
  warn: (scope: string, message: string, fields?: LogFields) => line("warn", scope, message, fields),
  error: (scope: string, message: string, fields?: LogFields) => line("error", scope, message, fields),
};
