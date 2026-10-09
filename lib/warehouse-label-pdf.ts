import { ean13Modules, type WarehouseLabel } from "@/lib/warehouse-barcode";

function pdfEscape(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/** A4 PDF, 2x5 labels per page. Bars are vector — printer/scanner readable. */
export function buildWarehouseLabelPdf(label: WarehouseLabel, count: number): Uint8Array {
  const pagesNeeded = Math.max(1, Math.ceil(count / 10));
  const objects: string[] = [];
  const offsets: number[] = [0];
  const pageIds: number[] = [];

  const addObj = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const modules = ean13Modules(label.barcode);
  const name = pdfEscape(label.name.slice(0, 48));
  const sku = pdfEscape(label.sku || "-");
  const oem = pdfEscape(label.oemNumber || "-");
  const pageW = 595;
  const pageH = 842;
  const colW = 268;
  const rowH = 150;
  const left = 30;
  const top = 780;

  const drawLabel = (x: number, y: number): string => {
    const lines = [
      "q",
      "0.85 0.85 0.85 RG 0.6 w",
      `${x} ${y - 130} ${colW} 130 re S`,
      "BT",
      `/F2 11 Tf ${x + 10} ${y - 18} Td (TAVFIQ) Tj`,
      `/F1 8 Tf 0 -14 Td (${name}) Tj`,
      `0 -12 Td (SKU: ${sku}) Tj`,
      `0 -12 Td (Artikul: ${oem}) Tj`,
      "ET",
    ];
    const barX = x + 18;
    const barY = y - 108;
    const moduleW = 2.15;
    const barH = 36;
    for (let i = 0; i < modules.length; i += 1) {
      if (modules[i] !== "1") continue;
      lines.push("0 0 0 rg");
      lines.push(`${(barX + i * moduleW).toFixed(2)} ${barY} ${moduleW.toFixed(2)} ${barH} re f`);
    }
    lines.push("BT", `/F1 9 Tf ${x + 70} ${y - 122} Td (${label.barcode}) Tj`, "ET", "Q");
    return lines.join("\n");
  };

  let remaining = count;
  for (let p = 0; p < pagesNeeded; p += 1) {
    const chunks: string[] = [];
    for (let i = 0; i < 10 && remaining > 0; i += 1) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      chunks.push(drawLabel(left + col * (colW + 12), top - row * rowH));
      remaining -= 1;
    }
    const stream = chunks.join("\n");
    const contentId = addObj(
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    );
    const pageId = addObj(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`,
    );
    pageIds.push(pageId);
  }

  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  const pagesId = addObj(`<< /Type /Pages /Count ${pageIds.length} /Kids [${kids}] >>`);
  for (const pid of pageIds) {
    objects[pid - 1] = objects[pid - 1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
  }
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  for (let i = 0; i < objects.length; i += 1) {
    offsets[i + 1] = Buffer.byteLength(pdf, "utf8");
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "utf8"));
}
