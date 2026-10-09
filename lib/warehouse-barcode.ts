/** Internal warehouse barcodes: EAN-13 with in-store prefix 200. Scannable. */

const L = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];
const G = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];
const R = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
];
const PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

export function ean13CheckDigit(d12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const n = Number(d12[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  return ean13CheckDigit(value.slice(0, 12)) === value[12];
}

export function generateWarehouseEan13(): string {
  const body = new Uint32Array(9);
  crypto.getRandomValues(body);
  const d12 = `200${Array.from(body, (n) => String(n % 10)).join("")}`;
  return d12 + ean13CheckDigit(d12);
}

export function ean13Modules(code: string): string {
  if (!isValidEan13(code)) throw new Error("Invalid EAN-13");
  const first = Number(code[0]);
  const parity = PARITY[first] ?? PARITY[0];
  let bits = "101";
  for (let i = 0; i < 6; i += 1) {
    const d = Number(code[i + 1]);
    bits += (parity[i] === "G" ? G : L)[d] ?? L[0];
  }
  bits += "01010";
  for (let i = 7; i < 13; i += 1) {
    bits += R[Number(code[i])] ?? R[0];
  }
  bits += "101";
  return bits;
}

export function ean13Svg(code: string, opts?: { width?: number; height?: number }): string {
  const modules = ean13Modules(code);
  const quiet = 11;
  const total = quiet * 2 + modules.length;
  const width = opts?.width ?? 220;
  const height = opts?.height ?? 64;
  const barH = height - 16;
  const unit = width / total;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${code}">`,
    `<rect width="${width}" height="${height}" fill="#fff"/>`,
  ];
  for (let i = 0; i < modules.length; i += 1) {
    if (modules[i] !== "1") continue;
    const x = (quiet + i) * unit;
    parts.push(`<rect x="${x.toFixed(3)}" y="2" width="${Math.max(unit, 0.6).toFixed(3)}" height="${barH}" fill="#111"/>`);
  }
  parts.push(
    `<text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="11" fill="#111">${code}</text>`,
    "</svg>",
  );
  return parts.join("");
}

export function ean13SvgDataUrl(code: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ean13Svg(code))}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type WarehouseLabel = {
  barcode: string;
  name: string;
  sku: string;
  oemNumber: string;
};

export function warehouseLabelHtml(label: WarehouseLabel, count: number): string {
  const svg = ean13Svg(label.barcode, { width: 240, height: 70 });
  const cards = Array.from({ length: count }, (_, i) => {
    return `<article class="label" aria-label="etiketka ${i + 1}">
      <p class="brand">TAVFIQ</p>
      <p class="name">${escapeHtml(label.name)}</p>
      <p class="meta">SKU: ${escapeHtml(label.sku || "—")}</p>
      <p class="meta">Artikul: ${escapeHtml(label.oemNumber || "—")}</p>
      <div class="bars">${svg}</div>
    </article>`;
  }).join("");
  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8"/>
  <title>TAVFIQ shtrix-kod — ${escapeHtml(label.name)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: Arial, sans-serif; margin: 0; color: #111; }
    .sheet { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; }
    .label { width: 88mm; min-height: 48mm; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; box-sizing: border-box; page-break-inside: avoid; }
    .brand { margin: 0; font-weight: 800; letter-spacing: .08em; font-size: 12px; }
    .name { margin: 4px 0; font-size: 13px; font-weight: 700; }
    .meta { margin: 0; font-size: 11px; color: #333; }
    .bars { margin-top: 4px; }
    .bars svg { width: 100%; height: auto; max-width: 240px; }
    .toolbar { padding: 10px 12px; font-size: 13px; }
    .toolbar button { padding: 8px 14px; font-weight: 700; cursor: pointer; }
    @media print { body { background: #fff; } .toolbar { display: none; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Chop etish</button>
    <span> ${count} etiketka</span>
  </div>
  <div class="sheet">${cards}</div>
</body>
</html>`;
}

