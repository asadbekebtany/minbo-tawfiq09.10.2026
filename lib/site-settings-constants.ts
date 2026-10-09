export type SiteSettings = {
  siteName: string;
  siteShortName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  freeDeliveryMin: number;
  commissionPercent: number;
  currency: string;
  primaryColor: string;
  accentColor: string;
  updatedAt: string;
};

/** Yakuniy tanlangan brend: TAVFIQ */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "TAVFIQ",
  siteShortName: "TAVFIQ",
  tagline: "Avtomobil ehtiyot qismlari marketplace",
  email: "info@tavfiq.uz",
  phone: "+998 71 200-00-00",
  address: "Toshkent shahri, O‘zbekiston",
  freeDeliveryMin: 500000,
  commissionPercent: 10,
  currency: "UZS",
  primaryColor: "#002d21",
  accentColor: "#f5b51b",
  updatedAt: new Date(0).toISOString(),
};
