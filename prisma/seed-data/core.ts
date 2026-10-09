import type { BannerType } from "@prisma/client";

/** Production/staging uchun minimal super admin (demo product admin yo‘q) */
export const PRODUCTION_SUPER_ADMIN = {
  phone: "+998712000000",
  name: "Super Admin",
  email: "super@tavfiq.uz",
  role: "super_admin" as const,
  adminRole: "super_admin" as const,
  permissions: ["*"],
} as const;

export const CATEGORIES = [
  { name: "Shinalar", nameRu: "Шины", slug: "shinalar", icon: "🔵", sortOrder: 1 },
  { name: "Disklar", nameRu: "Диски", slug: "disklar", icon: "⚙️", sortOrder: 2 },
  { name: "Motor moylari", nameRu: "Моторные масла", slug: "moylar", icon: "🛢️", sortOrder: 3 },
  { name: "Filtrlar", nameRu: "Фильтры", slug: "filtrlar", icon: "🔧", sortOrder: 4 },
  { name: "Akkumulyatorlar", nameRu: "Аккумуляторы", slug: "akkumulyator", icon: "🔋", sortOrder: 5 },
  { name: "Tormoz tizimi", nameRu: "Тормозная система", slug: "tormoz", icon: "🛑", sortOrder: 6 },
  { name: "Faralar", nameRu: "Фары", slug: "faralar", icon: "💡", sortOrder: 7 },
  { name: "Kuzov qismlari", nameRu: "Кузов", slug: "kuzov", icon: "🚗", sortOrder: 8 },
  { name: "Salon aksessuarlar", nameRu: "Салон", slug: "salon", icon: "🎭", sortOrder: 9 },
  { name: "Elektronika", nameRu: "Электроника", slug: "elektronika", icon: "📱", sortOrder: 10 },
  { name: "Avtokimyo", nameRu: "Автохимия", slug: "kimyo", icon: "🧪", sortOrder: 11 },
  { name: "Asboblar", nameRu: "Инструменты", slug: "asboblar", icon: "🔨", sortOrder: 12 },
  { name: "Amortizatorlar", nameRu: "Амортизаторы", slug: "amortizator", icon: "🔩", sortOrder: 13 },
  { name: "Svechalar", nameRu: "Свечи зажигания", slug: "svechalar", icon: "⚡", sortOrder: 14 },
  { name: "Remenlar", nameRu: "Ремни", slug: "remenlar", icon: "〰️", sortOrder: 15 },
  { name: "Podshipniklar", nameRu: "Подшипники", slug: "podshipnik", icon: "🔄", sortOrder: 16 },
  { name: "Radiatorlar", nameRu: "Радиаторы", slug: "radiator", icon: "❄️", sortOrder: 17 },
  { name: "Yuvish mahsulotlari", nameRu: "Автомойка", slug: "yuvish", icon: "🧼", sortOrder: 18 },
  { name: "Moy nasooslari", nameRu: "Масляные насосы", slug: "moy-nasos", icon: "⛽", sortOrder: 19 },
  { name: "Boshqa qismlar", nameRu: "Другие запчасти", slug: "boshqa", icon: "📦", sortOrder: 20 },
] as const;

export const BRANDS = [
  { name: "Michelin", slug: "michelin", country: "Frantsiya", sortOrder: 1 },
  { name: "Bridgestone", slug: "bridgestone", country: "Yaponiya", sortOrder: 2 },
  { name: "Continental", slug: "continental", country: "Germaniya", sortOrder: 3 },
  { name: "Pirelli", slug: "pirelli", country: "Italiya", sortOrder: 4 },
  { name: "Goodyear", slug: "goodyear", country: "AQSH", sortOrder: 5 },
  { name: "Nokian", slug: "nokian", country: "Finlandiya", sortOrder: 6 },
  { name: "Shell", slug: "shell", country: "Niderlandiya", sortOrder: 7 },
  { name: "Mobil", slug: "mobil", country: "AQSH", sortOrder: 8 },
  { name: "Castrol", slug: "castrol", country: "Britaniya", sortOrder: 9 },
  { name: "Bosch", slug: "bosch", country: "Germaniya", sortOrder: 10 },
  { name: "Denso", slug: "denso", country: "Yaponiya", sortOrder: 11 },
  { name: "Mann", slug: "mann", country: "Germaniya", sortOrder: 12 },
  { name: "Brembo", slug: "brembo", country: "Italiya", sortOrder: 13 },
  { name: "Valeo", slug: "valeo", country: "Frantsiya", sortOrder: 14 },
  { name: "NGK", slug: "ngk", country: "Yaponiya", sortOrder: 15 },
  { name: "Febi", slug: "febi", country: "Germaniya", sortOrder: 16 },
  { name: "Sachs", slug: "sachs", country: "Germaniya", sortOrder: 17 },
  { name: "SKF", slug: "skf", country: "Shvetsiya", sortOrder: 18 },
  { name: "Gates", slug: "gates", country: "AQSH", sortOrder: 19 },
  { name: "Varta", slug: "varta", country: "Germaniya", sortOrder: 20 },
  { name: "Hella", slug: "hella", country: "Germaniya", sortOrder: 21 },
  { name: "Osram", slug: "osram", country: "Germaniya", sortOrder: 22 },
  { name: "Mutlu", slug: "mutlu", country: "Turkiya", sortOrder: 23 },
  { name: "Lukoil", slug: "lukoil", country: "Rossiya", sortOrder: 24 },
  { name: "ZIC", slug: "zic", country: "Koreya", sortOrder: 25 },
  { name: "Motul", slug: "motul", country: "Frantsiya", sortOrder: 26 },
  { name: "Total", slug: "total", country: "Frantsiya", sortOrder: 27 },
  { name: "Lucas", slug: "lucas", country: "Britaniya", sortOrder: 28 },
  { name: "TRW", slug: "trw", country: "AQSH", sortOrder: 29 },
  { name: "Delphi", slug: "delphi", country: "AQSH", sortOrder: 30 },
] as const;

export const HERO_SLIDES = [
  {
    id: "disklar",
    title: "Alyumin disklar",
    subtitle: "R15 — R20, 500+ model",
    description: "Yengil, mustahkam va zamonaviy dizayn",
    discountText: "-15% chegirma",
    buttonText: "Hozir xarid qilish",
    buttonUrl: "/catalog/disklar",
    imageUrl: "/products/alloy-wheel.png",
    sortOrder: 1,
  },
  {
    id: "shinalar",
    title: "Premium shinalar",
    subtitle: "Michelin, Bridgestone, Continental",
    description: "Har bir mavsum uchun ishonchli tanlov",
    discountText: "-30% gacha",
    buttonText: "Shinalarni ko‘rish",
    buttonUrl: "/catalog/shinalar",
    imageUrl: "/products/car-tyre.png",
    sortOrder: 2,
  },
  {
    id: "moylar",
    title: "Original motor moylari",
    subtitle: "Castrol, Shell va Mobil",
    description: "Dvigatelga uzoq muddatli himoya",
    discountText: "-20% chegirma",
    buttonText: "Moylarni tanlash",
    buttonUrl: "/catalog/moylar",
    imageUrl: "/products/motor-oil.png",
    sortOrder: 3,
  },
] as const;

export const SITE_SETTINGS = {
  id: "main",
  siteName: "TAVFIQ",
  siteShortName: "TAVFIQ",
  tagline: "Avtomobil ehtiyot qismlari marketplace",
  email: "info@tavfiq.uz",
  phone: "+998 71 200-00-00",
  address: "Toshkent shahri, O‘zbekiston",
  freeDeliveryMin: 500_000,
  commissionPercent: 10,
  currency: "UZS",
  primaryColor: "#002d21",
  accentColor: "#f5b51b",
} as const;

export const BANNERS: Array<{
  id: string;
  title: string;
  titleRu: string;
  image: string;
  link: string;
  type: BannerType;
  sortOrder: number;
}> = [
  {
    id: "banner-shinalar",
    title: "Yozgi shinalar aksiyasi",
    titleRu: "Акция на летние шины",
    image: "/products/car-tyre.png",
    link: "/catalog/shinalar",
    type: "main",
    sortOrder: 1,
  },
  {
    id: "banner-moylar",
    title: "Motor moylari chegirma",
    titleRu: "Скидки на моторные масла",
    image: "/products/motor-oil.png",
    link: "/catalog/moylar",
    type: "main",
    sortOrder: 2,
  },
  {
    id: "banner-disklar",
    title: "Disklar yangi kolleksiya",
    titleRu: "Новая коллекция дисков",
    image: "/products/alloy-wheel.png",
    link: "/catalog/disklar",
    type: "main",
    sortOrder: 3,
  },
];

/** Production uchun minimal pickup punktlar (demo emas) */
export const PRODUCTION_PICKUP_POINTS = [
  {
    name: "TAVFIQ markaziy filial",
    address: "Toshkent shahri, markaziy ofis",
    district: "Mirobod",
    workHours: "09:00–21:00",
    latitude: 41.299,
    longitude: 69.2395,
    rating: 4.8,
  },
  {
    name: "TAVFIQ Chilonzor filiali",
    address: "Chilonzor t., 14-kvartal",
    district: "Chilonzor",
    workHours: "09:00–21:00",
    latitude: 41.2995,
    longitude: 69.2401,
    rating: 4.7,
  },
  {
    name: "TAVFIQ Yunusobod filiali",
    address: "Amir Temur shoh ko'ch., 108",
    district: "Yunusobod",
    workHours: "09:00–21:00",
    latitude: 41.3545,
    longitude: 69.3063,
    rating: 4.6,
  },
] as const;
