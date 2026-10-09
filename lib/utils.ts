import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function groupThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** SSR va clientda bir xil ko‘rinish uchun ming ajratgich (bo‘shliq). */
export function formatCount(value: number): string {
  return groupThousands(value);
}

export function formatPrice(price: number): string {
  return groupThousands(price) + " so'm";
}

export function formatPriceShort(price: number): string {
  if (price >= 1_000_000) {
    return (price / 1_000_000).toFixed(1) + " mln so'm";
  }
  return groupThousands(price) + " so'm";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function calculateDiscount(price: number, oldPrice: number): number {
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function getDeliveryDate(days = 3): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("uz-UZ", {
    month: "long",
    day: "numeric",
  });
}
