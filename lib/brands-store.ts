import crypto from "crypto";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";

export type MarketplaceBrand = {
  id: string;
  name: string;
  slug: string;
  country: string;
  logo: string;
  isActive: boolean;
  sortOrder: number;
  count: number;
  createdAt: string;
  updatedAt: string;
};

const now = () => new Date().toISOString();
const defaults: MarketplaceBrand[] = [
  ["Michelin", "michelin", "Fransiya", "M", 124],
  ["Bridgestone", "bridgestone", "Yaponiya", "B", 98],
  ["Continental", "continental", "Germaniya", "C", 87],
  ["Pirelli", "pirelli", "Italiya", "P", 76],
  ["Goodyear", "goodyear", "AQSH", "G", 65],
  ["Shell", "shell", "Niderlandiya", "S", 48],
  ["Castrol", "castrol", "Britaniya", "C", 38],
  ["Bosch", "bosch", "Germaniya", "B", 112],
  ["Denso", "denso", "Yaponiya", "D", 89],
  ["Brembo", "brembo", "Italiya", "B", 45],
  ["Varta", "varta", "Germaniya", "V", 33],
  ["Mann", "mann", "Germaniya", "M", 67],
].map(([name, slug, country, logo, count], index) => ({
  id: `seed-${slug}`,
  name: String(name), slug: String(slug), country: String(country), logo: String(logo),
  isActive: true, sortOrder: index + 1, count: Number(count), createdAt: now(), updatedAt: now(),
}));

function read(): MarketplaceBrand[] {
  return readJsonFile("brands.json", defaults).sort((a, b) => a.sortOrder - b.sortOrder);
}
function save(items: MarketplaceBrand[]) { writeJsonFile("brands.json", items); }
export function getBrands(activeOnly = false): MarketplaceBrand[] {
  const items = read();
  return activeOnly ? items.filter((item) => item.isActive) : items;
}
export function getBrand(idOrSlug: string): MarketplaceBrand | undefined {
  return read().find((item) => item.id === idOrSlug || item.slug === idOrSlug);
}
export function createBrand(input: Partial<MarketplaceBrand>): MarketplaceBrand {
  const items = read();
  const name = input.name?.trim() || "Yangi brend";
  const slug = (input.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  if (items.some((item) => item.slug === slug)) throw new Error("Bu slug allaqachon mavjud");
  const brand: MarketplaceBrand = {
    id: crypto.randomUUID(), name, slug, country: input.country?.trim() || "",
    logo: input.logo?.trim() || name[0]?.toUpperCase() || "B", isActive: input.isActive ?? true,
    sortOrder: Number(input.sortOrder ?? items.length + 1), count: Number(input.count ?? 0),
    createdAt: now(), updatedAt: now(),
  };
  save([...items, brand]);
  return brand;
}
export function updateBrand(id: string, input: Partial<MarketplaceBrand>): MarketplaceBrand | undefined {
  const items = read();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return undefined;
  const next = { ...items[index], ...input, id: items[index].id, createdAt: items[index].createdAt, updatedAt: now() };
  items[index] = next;
  save(items);
  return next;
}
export function deleteBrand(id: string): boolean {
  const items = read();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  save(next);
  return true;
}
