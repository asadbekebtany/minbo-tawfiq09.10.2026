import type { SiteSetting } from "@prisma/client";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/site-settings-constants";

export type { SiteSettings };
export { DEFAULT_SITE_SETTINGS };

const SITE_SETTING_ID = "main";

function mapFromDb(row: SiteSetting): SiteSettings {
  return {
    siteName: row.siteName,
    siteShortName: row.siteShortName,
    tagline: row.tagline ?? DEFAULT_SITE_SETTINGS.tagline,
    email: row.email ?? DEFAULT_SITE_SETTINGS.email,
    phone: row.phone ?? DEFAULT_SITE_SETTINGS.phone,
    address: row.address ?? DEFAULT_SITE_SETTINGS.address,
    freeDeliveryMin: row.freeDeliveryMin,
    commissionPercent: row.commissionPercent,
    currency: row.currency,
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeInput(
  current: SiteSettings,
  input: Partial<SiteSettings>,
): SiteSettings {
  return {
    ...current,
    ...input,
    siteName: (input.siteName ?? current.siteName).trim() || DEFAULT_SITE_SETTINGS.siteName,
    siteShortName:
      (input.siteShortName ?? current.siteShortName).trim() ||
      DEFAULT_SITE_SETTINGS.siteShortName,
    tagline: (input.tagline ?? current.tagline).trim(),
    email: (input.email ?? current.email).trim(),
    phone: (input.phone ?? current.phone).trim(),
    address: (input.address ?? current.address).trim(),
    freeDeliveryMin: Number(input.freeDeliveryMin ?? current.freeDeliveryMin),
    commissionPercent: Number(input.commissionPercent ?? current.commissionPercent),
    currency: (input.currency ?? current.currency).trim() || "UZS",
    primaryColor: input.primaryColor ?? current.primaryColor,
    accentColor: input.accentColor ?? current.accentColor,
    updatedAt: new Date().toISOString(),
  };
}

function toDbFields(settings: SiteSettings) {
  return {
    siteName: settings.siteName,
    siteShortName: settings.siteShortName,
    tagline: settings.tagline,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    freeDeliveryMin: settings.freeDeliveryMin,
    commissionPercent: settings.commissionPercent,
    currency: settings.currency,
    primaryColor: settings.primaryColor,
    accentColor: settings.accentColor,
  };
}

const LEGACY_SITE_NAMES = new Set(["MAVLON TYRE", "Mavlon Tyre"]);

function normalizeLegacyBrand(settings: SiteSettings): SiteSettings {
  const isLegacy =
    LEGACY_SITE_NAMES.has(settings.siteName.trim()) ||
    settings.siteShortName.trim() === "MAVLON";

  if (!isLegacy) return settings;

  return {
    ...DEFAULT_SITE_SETTINGS,
    ...settings,
    siteName: DEFAULT_SITE_SETTINGS.siteName,
    siteShortName: DEFAULT_SITE_SETTINGS.siteShortName,
    email: /@mavlon|mavlontyre/i.test(settings.email)
      ? DEFAULT_SITE_SETTINGS.email
      : settings.email,
    updatedAt: new Date().toISOString(),
  };
}

/** JSON fallback — DB ulanmaganida ishlatiladi */
export function getSiteSettingsSync(): SiteSettings {
  const stored = {
    ...DEFAULT_SITE_SETTINGS,
    ...readJsonFile("site-settings.json", DEFAULT_SITE_SETTINGS),
  };
  const normalized = normalizeLegacyBrand(stored);
  if (normalized.siteName !== stored.siteName) {
    writeJsonFile("site-settings.json", normalized);
  }
  return normalized;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (await checkDatabaseConnection()) {
    try {
      const row = await prisma.siteSetting.findUnique({
        where: { id: SITE_SETTING_ID },
      });
      if (row) {
        const mapped = normalizeLegacyBrand(mapFromDb(row));
        if (mapped.siteName !== row.siteName) {
          try {
            await prisma.siteSetting.update({
              where: { id: SITE_SETTING_ID },
              data: toDbFields(mapped),
            });
            writeJsonFile("site-settings.json", mapped);
          } catch {
            // DB yangilab bo'lmadi — xarita qilingan qiymat baribir qaytariladi
          }
        }
        return mapped;
      }
    } catch {
      // DB vaqtincha ishlamayapti
    }
  }
  return getSiteSettingsSync();
}

export async function updateSiteSettings(
  input: Partial<SiteSettings>,
): Promise<SiteSettings> {
  const current = await getSiteSettings();
  const next = normalizeInput(current, input);

  if (await checkDatabaseConnection()) {
    try {
      const row = await prisma.siteSetting.upsert({
        where: { id: SITE_SETTING_ID },
        create: { id: SITE_SETTING_ID, ...toDbFields(next) },
        update: toDbFields(next),
      });
      const saved = mapFromDb(row);
      writeJsonFile("site-settings.json", saved);
      return saved;
    } catch {
      // JSON fallback
    }
  }

  writeJsonFile("site-settings.json", next);
  return next;
}

export function validateSiteSettingsInput(
  input: Partial<SiteSettings>,
): string | null {
  if (input.siteName !== undefined && input.siteName.trim().length < 2) {
    return "Sayt nomi kamida 2 ta belgidan iborat bo‘lishi kerak";
  }
  if (input.siteShortName !== undefined && input.siteShortName.trim().length < 2) {
    return "Qisqa nom kamida 2 ta belgidan iborat bo‘lishi kerak";
  }
  if (
    input.freeDeliveryMin !== undefined &&
    (Number.isNaN(Number(input.freeDeliveryMin)) || Number(input.freeDeliveryMin) < 0)
  ) {
    return "Bepul yetkazish summasi noto‘g‘ri";
  }
  if (
    input.commissionPercent !== undefined &&
    (Number.isNaN(Number(input.commissionPercent)) ||
      Number(input.commissionPercent) < 0 ||
      Number(input.commissionPercent) > 100)
  ) {
    return "Komissiya 0–100% oralig‘ida bo‘lishi kerak";
  }
  return null;
}
