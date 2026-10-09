import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { denyUnlessWarehouseActive } from "@/lib/warehouse-access";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getSellerStoreForUser } from "@/lib/seller-store";
import { isValidEan13, warehouseLabelHtml } from "@/lib/warehouse-barcode";
import { buildWarehouseLabelPdf } from "@/lib/warehouse-label-pdf";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }
  const blocked = await denyUnlessWarehouseActive(user);
  if (blocked) return blocked;

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId")?.trim() || "";
  const format = (url.searchParams.get("format") || "html").toLowerCase();
  const countRaw = Number(url.searchParams.get("count") || "1");
  const count = countRaw === 10 || countRaw === 50 ? countRaw : 1;

  if (!productId) return NextResponse.json({ error: "Mahsulot tanlanmadi" }, { status: 400 });

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { name: true, sku: true, oemNumber: true, barcode: true },
  });
  if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
  if (!product.barcode) {
    return NextResponse.json({ error: "Avval shtrix-kod yarating" }, { status: 400 });
  }
  if (!isValidEan13(product.barcode)) {
    return NextResponse.json({ error: "Barcode noto‘g‘ri" }, { status: 400 });
  }
  if (format !== "html" && format !== "pdf") {
    return NextResponse.json({ error: "Format html yoki pdf bo‘lsin" }, { status: 400 });
  }

  const label = {
    barcode: product.barcode,
    name: product.name,
    sku: product.sku ?? "",
    oemNumber: product.oemNumber ?? "",
  };

  if (format === "pdf") {
    try {
      const bytes = buildWarehouseLabelPdf(label, count);
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="tavfiq-barcode-${count}.pdf"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "PDF yaratilmadi" }, { status: 500 });
    }
  }

  return new NextResponse(warehouseLabelHtml(label, count), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
