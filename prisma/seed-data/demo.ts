/** Demo OTP — .env dagi OTP_DEMO_CODES bilan mos */
export const DEMO_OTP_HINT = "1234";

/** Development seed: demo admin va super admin */
export const DEMO_STAFF_USERS = [
  {
    phone: "+998712000000",
    name: "Super Admin",
    email: "super@tavfiq.uz",
    role: "super_admin" as const,
    adminRole: "super_admin" as const,
    permissions: ["*"],
  },
  {
    phone: "+998712000001",
    name: "Mahsulot Admin",
    email: "admin@tavfiq.uz",
    role: "admin" as const,
    adminRole: "product_manager" as const,
    permissions: [
      "products.view",
      "products.create",
      "products.edit",
      "products.approve",
      "categories.view",
      "brands.view",
      "brands.create",
      "brands.edit",
      "brands.delete",
    ],
  },
] as const;

/** Faqat dev login uchun kerakli demo xaridorlar (lib/users.ts fallback bilan mos) */
export const DEMO_CUSTOMERS = [
  { name: "Aziz Karimov", email: "aziz@demo.uz", phone: "+998901234567" },
  { name: "Dilnoza Yusupova", email: "dilnoza@demo.uz", phone: "+998911234567" },
] as const;

/** Demo sellerlar — birinchi login uchun +998712000002 */
export const DEMO_SELLERS = [
  {
    name: "Sarvar Yusupov",
    email: "sarvar@autoparts.uz",
    phone: "+998712000002",
    store: "AutoParts Pro",
    slug: "autoparts-pro",
    rating: 4.8,
    reviewCount: 142,
  },
  {
    name: "Jasur Mirzayev",
    email: "jasur@motoshop.uz",
    phone: "+998712000003",
    store: "MotoShop",
    slug: "motoshop",
    rating: 4.6,
    reviewCount: 98,
  },
  {
    name: "Bekzod Karimov",
    email: "bekzod@tyreworld.uz",
    phone: "+998712000005",
    store: "TyreWorld",
    slug: "tyre-world",
    rating: 4.7,
    reviewCount: 115,
  },
] as const;

export const DEMO_COUPONS = [
  { code: "TAVFIQ10", type: "percentage", value: 10, minOrder: 200_000, maxUses: 100 },
  { code: "DEVTEST50", type: "fixed", value: 50_000, minOrder: 500_000, maxUses: 50 },
] as const;

export const DEMO_REVIEW_TEXTS = [
  "Juda yaxshi mahsulot, tavsiya qilaman!",
  "Sifat a'lo, narx ham qulay. Rahmat!",
  "O'rnatish oson, ishlashi yaxshi.",
] as const;

export const DEMO_CATEGORY_IMAGES: Record<string, string> = {
  shinalar: "/products/car-tyre.png",
  disklar: "/products/alloy-wheel.png",
  moylar: "/products/motor-oil.png",
  filtrlar: "/products/brake-disc.png",
  akkumulyator: "/products/car-battery.png",
  tormoz: "/products/brake-disc.png",
  faralar: "/products/car-tyre.png",
  kimyo: "/products/motor-oil.png",
  elektronika: "/products/car-battery.png",
  amortizator: "/products/brake-disc.png",
  podshipnik: "/products/brake-disc.png",
  remenlar: "/products/brake-disc.png",
  svechalar: "/products/car-battery.png",
};

export const DEMO_CAR_DATA = [
  {
    name: "Chevrolet",
    models: [
      { name: "Cobalt", years: [2013, 2024] as const, engines: ["1.5 MT", "1.5 AT"] },
      { name: "Lacetti", years: [2004, 2013] as const, engines: ["1.4 MT", "1.6 MT"] },
      { name: "Nexia 3", years: [2016, 2024] as const, engines: ["1.5 MT", "1.5 AT"] },
    ],
  },
  {
    name: "Toyota",
    models: [
      { name: "Camry", years: [2000, 2024] as const, engines: ["2.0 AT", "2.5 AT"] },
      { name: "Corolla", years: [2000, 2024] as const, engines: ["1.6 MT", "1.8 AT"] },
    ],
  },
] as const;

/** Katalogni sinash uchun qisqartirilgan demo mahsulotlar */
export const DEMO_PRODUCTS = [
  { name: "Michelin Energy Saver+ 205/55 R16 91H", slug: "michelin-energy-saver-205-55-r16", catSlug: "shinalar", brandSlug: "michelin", price: 1_250_000, oldPrice: 1_650_000, stock: 12, oemNumber: "ME20555R16" },
  { name: "Bridgestone Potenza Sport 225/45 R17", slug: "bridgestone-potenza-225-45-r17", catSlug: "shinalar", brandSlug: "bridgestone", price: 1_890_000, oldPrice: 2_100_000, stock: 6, oemNumber: "BP22545R17" },
  { name: "Shell Helix Ultra 5W-40 4L", slug: "shell-helix-ultra-5w40-4l", catSlug: "moylar", brandSlug: "shell", price: 189_000, oldPrice: 229_000, stock: 45, oemNumber: "SHU5W40-4" },
  { name: "Castrol Edge 5W-30 LL 4L", slug: "castrol-edge-5w30-ll-4l", catSlug: "moylar", brandSlug: "castrol", price: 210_000, oldPrice: 260_000, stock: 30, oemNumber: "CE5W30-4" },
  { name: "Mann-Filter W 712/95 Moy filtri", slug: "mann-filter-w712-95", catSlug: "filtrlar", brandSlug: "mann", price: 45_000, oldPrice: 55_000, stock: 87, oemNumber: "MW71295" },
  { name: "Bosch S5 60Ah 540A Akkumulyator", slug: "bosch-s5-60ah-akkumulyator", catSlug: "akkumulyator", brandSlug: "bosch", price: 890_000, oldPrice: 1_050_000, stock: 12, oemNumber: "BS560540" },
  { name: "Brembo P 59 020 Tormoz kolodkalari", slug: "brembo-p59020-tormoz-kolodka", catSlug: "tormoz", brandSlug: "brembo", price: 185_000, oldPrice: 220_000, stock: 22, oemNumber: "BP59020" },
  { name: "NGK IZFR6K-11 Iridium Svecha", slug: "ngk-izfr6k-11-iridium", catSlug: "svechalar", brandSlug: "ngk", price: 28_000, oldPrice: 34_000, stock: 120, oemNumber: "NGKIZFR6K11" },
  { name: "BBS CH-R 17x8 5x114.3 ET35 Disk", slug: "bbs-chr-17x8-disk", catSlug: "disklar", brandSlug: "continental", price: 1_850_000, oldPrice: 2_100_000, stock: 4, oemNumber: "BBSCHR178" },
  { name: "Osram H7 Night Breaker +200% lampa", slug: "osram-h7-night-breaker-200", catSlug: "faralar", brandSlug: "osram", price: 85_000, oldPrice: 100_000, stock: 35, oemNumber: "OH7NB200" },
] as const;

/** Development-only PVZ operator — PickupPoint.operatorId bilan bog‘lanadi */
export const DEMO_PVZ_OPERATOR = {
  phone: "+998712000006",
  name: "PVZ Operator",
  email: "pvz@tavfiq.uz",
  pickupPointName: "Chilonzor savdo markazi",
} as const;

export const DEMO_PICKUP_POINTS = [
  { name: "Chilonzor savdo markazi", address: "Chilonzor t., 14-kvartal, 2-uy", district: "Chilonzor", workHours: "09:00–21:00", latitude: 41.2995, longitude: 69.2401, rating: 4.7 },
  { name: "Yunusobod filial", address: "Amir Temur shoh ko'ch., 108", district: "Yunusobod", workHours: "09:00–21:00", latitude: 41.3545, longitude: 69.3063, rating: 4.6 },
  { name: "Sergeli omborxona", address: "Sergeli tumani, 7-mavze, 1A", district: "Sergeli", workHours: "10:00–20:00", latitude: 41.2184, longitude: 69.235, rating: 4.5 },
  { name: "Mirzo Ulug'bek filial", address: "Bog'ishamol ko'ch., 55", district: "Mirzo Ulug'bek", workHours: "09:00–20:00", latitude: 41.3288, longitude: 69.34, rating: 4.4 },
  { name: "Shayxontohur filial", address: "Shayxontohur ko'ch., 12B", district: "Shayxontohur", workHours: "09:00–21:00", latitude: 41.3085, longitude: 69.262, rating: 4.8 },
] as const;

export function demoProductImageForCategory(catSlug: string): string {
  return DEMO_CATEGORY_IMAGES[catSlug] ?? "/placeholder-product.png";
}

export function demoSeededMetric(index: number, min: number, max: number): number {
  if (max <= min) return min;
  return min + (index * 17) % (max - min + 1);
}

export function demoSeededRating(index: number): number {
  return +(3.6 + (index % 14) * 0.1).toFixed(1);
}
