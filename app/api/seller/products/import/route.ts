import { NextResponse } from "next/server";
import { requireSellerApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import { getSellerStoreForUser } from "@/lib/seller-store";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "mahsulot"
  );
}

function parseCsv(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

export async function POST(request: Request) {
  const { error, user } = await requireSellerApi();
  if (error || !user) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan" }, { status: 503 });
  }

  const store = await getSellerStoreForUser(user.id, user.role);
  if (!store) return NextResponse.json({ error: "Do‘kon topilmadi" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV fayl yuboring" }, { status: 400 });
  }
  const csvName = file.name.toLowerCase();
  if (!csvName.endsWith(".csv")) {
    return NextResponse.json({ error: "Faqat .csv fayl qabul qilinadi" }, { status: 415 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "CSV 2 MB dan oshmasin" }, { status: 413 });
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV bo‘sh. Sarlavha + kamida 1 qator kerak" }, { status: 400 });
  }

  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const nameI = idx("name");
  const priceI = idx("price");
  const stockI = idx("stock");
  const categoryI = idx("category");
  const descI = idx("description");
  if (nameI < 0 || priceI < 0) {
    return NextResponse.json(
      { error: "CSV ustunlari: name,price,stock,category,description" },
      { status: 400 },
    );
  }

  const categories = await prisma.category.findMany({ select: { id: true, slug: true, name: true } });
  const fallbackCategory = categories[0];
  if (!fallbackCategory) {
    return NextResponse.json({ error: "Kategoriya yo‘q" }, { status: 400 });
  }

  let created = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const name = row[nameI];
    const price = Number(String(row[priceI] ?? "").replace(/\s/g, ""));
    if (!name || !Number.isFinite(price) || price < 0) {
      errors.push(`${i + 1}-qator: nom yoki narx xato`);
      continue;
    }
    const stock = Number(row[stockI] ?? 0) || 0;
    const catKey = (row[categoryI] ?? "").toLowerCase();
    const category =
      categories.find((c) => c.slug === catKey || c.name.toLowerCase() === catKey) ?? fallbackCategory;
    const slug = `${slugify(name)}-${Date.now().toString(36)}${i}`;

    try {
      await prisma.product.create({
        data: {
          storeId: store.id,
          categoryId: category.id,
          name,
          slug,
          description: descI >= 0 ? row[descI] || null : null,
          price: Math.round(price),
          stock: Math.max(0, Math.round(stock)),
          isActive: true,
          isApproved: user.role === "admin" || user.role === "super_admin",
        },
      });
      created += 1;
    } catch {
      errors.push(`${i + 1}-qator: saqlanmadi`);
    }
  }

  return NextResponse.json({ success: true, created, errors });
}
