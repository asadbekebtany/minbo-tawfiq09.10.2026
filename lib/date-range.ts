export function resolveAnalyticsRange(preset: string, from?: string, to?: string) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  if (preset === "custom" && from && to) {
    return { from: new Date(from), to: new Date(to) };
  }

  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "last7": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    case "last30": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case "prevMonth": {
      const fromD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const toD = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: fromD, to: toD };
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return { from: new Date(now.getFullYear(), q, 1), to: endOfDay(now) };
    }
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}
