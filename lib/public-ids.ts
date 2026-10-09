function pad(n: number, size: number) {
  return String(n).padStart(size, "0");
}

function ymd(date = new Date()) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1, 2);
  const d = pad(date.getDate(), 2);
  return `${y}${m}${d}`;
}

function rand(size = 6) {
  return pad(Math.floor(Math.random() * 10 ** size), size);
}

export function nextOrderNumber(date = new Date()) {
  return `TAV-${ymd(date)}-${rand(6)}`;
}

export function nextTrackingNumber() {
  return `TRK-${ymd()}-${rand(8)}`;
}

export function nextReturnNumber() {
  return `RET-${ymd()}-${rand(6)}`;
}

export function nextPayoutNumber() {
  return `PAY-${ymd()}-${rand(6)}`;
}

export function nextPaymentTxId(provider: string) {
  return `${provider.toUpperCase()}-${ymd()}-${rand(10)}`;
}
