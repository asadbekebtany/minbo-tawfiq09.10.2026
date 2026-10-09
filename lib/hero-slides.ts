import fs from "fs";
import path from "path";
import crypto from "crypto";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

/**
 * Hero slides: PostgreSQL (HeroSlide) asosiy manba.
 * DB yo‘q bo‘lsa development JSON fallback (`data/hero-slides.json`).
 * Rasmlar StorageProvider orqali /uploads ostida saqlanadi.
 */

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  discountText: string;
  buttonText: string;
  buttonUrl: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HeroSlideInput = Omit<HeroSlide, "id" | "createdAt" | "updatedAt">;

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "hero-slides.json");

const now = () => new Date().toISOString();

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "seed-disklar",
    title: "Alyumin disklar",
    subtitle: "R15 — R20, 500+ model",
    description: "",
    discountText: "-15% chegirma",
    buttonText: "Hozir xarid qilish",
    buttonUrl: "/catalog/disklar",
    imageUrl: "/products/alloy-wheel.png",
    sortOrder: 1,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "seed-shinalar",
    title: "Yozgi shinalar",
    subtitle: "Michelin, Bridgestone, Continental",
    description: "",
    discountText: "-30% chegirma",
    buttonText: "Hozir xarid qilish",
    buttonUrl: "/catalog/shinalar",
    imageUrl: "/products/car-tyre.png",
    sortOrder: 2,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "seed-moylar",
    title: "Original motor moylari",
    subtitle: "Castrol, Shell va Mobil",
    description: "Dvigatelga uzoq muddatli himoya",
    discountText: "-20% chegirma",
    buttonText: "Moylarni tanlash",
    buttonUrl: "/catalog/moylar",
    imageUrl: "/products/motor-oil.png",
    sortOrder: 3,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

function mapRow(row: {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  discountText: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): HeroSlide {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    discountText: row.discountText ?? "",
    buttonText: row.buttonText ?? "Hozir xarid qilish",
    buttonUrl: row.buttonUrl ?? "/catalog",
    imageUrl: row.imageUrl ?? "",
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function readStore(): HeroSlide[] {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return DEFAULT_SLIDES.map((s) => ({ ...s }));
    }
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as HeroSlide[];
    if (!Array.isArray(parsed)) return DEFAULT_SLIDES.map((s) => ({ ...s }));
    return parsed;
  } catch {
    return DEFAULT_SLIDES.map((s) => ({ ...s }));
  }
}

function writeStore(slides: HeroSlide[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(slides, null, 2), "utf-8");
}

function sortSlides(slides: HeroSlide[]): HeroSlide[] {
  return [...slides].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
  );
}

export async function getAllSlides(): Promise<HeroSlide[]> {
  if (await checkDatabaseConnection()) {
    const rows = await prisma.heroSlide.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    return rows.map(mapRow);
  }
  return sortSlides(readStore());
}

export async function getActiveSlides(): Promise<HeroSlide[]> {
  if (await checkDatabaseConnection()) {
    const rows = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(mapRow);
  }
  return sortSlides(readStore().filter((s) => s.isActive));
}

export async function createSlide(input: Partial<HeroSlideInput>): Promise<HeroSlide> {
  const payload = {
    title: input.title?.trim() || "Yangi slayd",
    subtitle: input.subtitle ?? "",
    description: input.description ?? "",
    discountText: input.discountText ?? "",
    buttonText: input.buttonText ?? "Hozir xarid qilish",
    buttonUrl: input.buttonUrl ?? "/catalog",
    imageUrl: input.imageUrl ?? "",
    sortOrder: typeof input.sortOrder === "number" && !Number.isNaN(input.sortOrder) ? input.sortOrder : 0,
    isActive: input.isActive ?? true,
  };

  if (await checkDatabaseConnection()) {
    const max = await prisma.heroSlide.aggregate({ _max: { sortOrder: true } });
    const row = await prisma.heroSlide.create({
      data: {
        ...payload,
        sortOrder: payload.sortOrder || (max._max.sortOrder ?? 0) + 1,
      },
    });
    return mapRow(row);
  }

  const slides = readStore();
  const maxOrder = slides.reduce((m, s) => Math.max(m, s.sortOrder), 0);
  const slide: HeroSlide = {
    id: crypto.randomUUID(),
    ...payload,
    sortOrder: payload.sortOrder || maxOrder + 1,
    createdAt: now(),
    updatedAt: now(),
  };
  writeStore([...slides, slide]);
  return slide;
}

export async function updateSlide(
  id: string,
  input: Partial<HeroSlideInput>,
): Promise<HeroSlide | undefined> {
  if (await checkDatabaseConnection()) {
    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) return undefined;
    const row = await prisma.heroSlide.update({
      where: { id },
      data: {
        title: input.title ?? existing.title,
        subtitle: input.subtitle ?? existing.subtitle,
        description: input.description ?? existing.description,
        discountText: input.discountText ?? existing.discountText,
        buttonText: input.buttonText ?? existing.buttonText,
        buttonUrl: input.buttonUrl ?? existing.buttonUrl,
        imageUrl: input.imageUrl ?? existing.imageUrl,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        isActive: input.isActive ?? existing.isActive,
      },
    });
    return mapRow(row);
  }

  const slides = readStore();
  const idx = slides.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  const updated: HeroSlide = {
    ...slides[idx],
    ...input,
    id: slides[idx].id,
    createdAt: slides[idx].createdAt,
    updatedAt: now(),
  };
  slides[idx] = updated;
  writeStore(slides);
  return updated;
}

export async function deleteSlide(id: string): Promise<boolean> {
  if (await checkDatabaseConnection()) {
    try {
      await prisma.heroSlide.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  const slides = readStore();
  const next = slides.filter((s) => s.id !== id);
  if (next.length === slides.length) return false;
  writeStore(next);
  return true;
}

export async function reorderSlides(orderedIds: string[]): Promise<HeroSlide[]> {
  if (await checkDatabaseConnection()) {
    await prisma.$transaction(
      orderedIds.map((id, i) =>
        prisma.heroSlide.updateMany({ where: { id }, data: { sortOrder: i + 1 } }),
      ),
    );
    return getAllSlides();
  }

  const slides = readStore();
  const orderMap = new Map(orderedIds.map((id, i) => [id, i + 1]));
  const next = slides.map((s) =>
    orderMap.has(s.id) ? { ...s, sortOrder: orderMap.get(s.id)!, updatedAt: now() } : s,
  );
  writeStore(next);
  return sortSlides(next);
}
