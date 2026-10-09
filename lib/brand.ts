import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings-constants";

/** Yakuniy tanlangan brend: TAVFIQ */
export const BRAND_NAME = DEFAULT_SITE_SETTINGS.siteName;
export const BRAND_SHORT_NAME = DEFAULT_SITE_SETTINGS.siteShortName;
export const BRAND_TAGLINE = DEFAULT_SITE_SETTINGS.tagline;

export function resolveBrandName(settings?: Pick<SiteSettings, "siteName">): string {
  return settings?.siteName?.trim() || BRAND_NAME;
}

export function getBrandPageTitle(
  settings?: Pick<SiteSettings, "siteName" | "tagline">,
): string {
  const name = resolveBrandName(settings);
  const tagline = settings?.tagline?.trim() || BRAND_TAGLINE;
  return `${name} — ${tagline}`;
}

export function getCopyrightText(
  siteName?: string,
  year = new Date().getFullYear(),
): string {
  return `© ${year} ${siteName ?? BRAND_NAME}. Barcha huquqlar himoyalangan.`;
}

export function getAdminPanelSubtitle(siteName?: string): string {
  return `${siteName ?? BRAND_NAME} boshqaruv paneli`;
}

/** Matnlardagi {{brand}} placeholderini almashtiradi */
export function injectBrand(text: string, siteName?: string): string {
  return text.replace(/\{\{brand\}\}/g, siteName ?? BRAND_NAME);
}

/** Buyurtma va fallback matnlarda: "TAVFIQ Marketplace" */
export function getMarketplaceLabel(siteName?: string): string {
  return `${resolveBrandName(siteName ? { siteName } : undefined)} Marketplace`;
}

/** NPM paket va localStorage kalitlari uchun slug */
export const PROJECT_SLUG = "tavfiq-marketplace";
