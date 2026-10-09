import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import { serverEnv } from "@/lib/env.server";

export type PlatformSettings = {
  maintenanceMode: boolean;
  allowNewSellerRegistration: boolean;
  allowReviews: boolean;
  allowReturns: boolean;
  cashPaymentEnabled: boolean;
  cardPaymentEnabled: boolean;
  paymeEnabled: boolean;
  clickEnabled: boolean;
  smsOtpEnabled: boolean;
  demoOtpAllowed: boolean;
  minOrderAmount: number;
  maxUploadMb: number;
  lowStockThreshold: number;
  payoutHoldDays: number;
  updatedAt: string;
  updatedBy: string | null;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  maintenanceMode: false,
  allowNewSellerRegistration: true,
  allowReviews: true,
  allowReturns: true,
  cashPaymentEnabled: true,
  cardPaymentEnabled: true,
  paymeEnabled: false,
  clickEnabled: false,
  smsOtpEnabled: true,
  demoOtpAllowed: true,
  minOrderAmount: 0,
  maxUploadMb: 5,
  lowStockThreshold: 5,
  payoutHoldDays: 7,
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
};

const FILE = "platform-settings.json";

export function getPlatformSettings(): PlatformSettings {
  const stored = readJsonFile<PlatformSettings>(FILE, DEFAULT_PLATFORM_SETTINGS);
  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...stored,
    // Env-configured gateways: UI can enable only if secrets exist
    paymeEnabled: Boolean(stored.paymeEnabled && serverEnv.payme.isConfigured),
    clickEnabled: Boolean(stored.clickEnabled && serverEnv.click?.isConfigured),
  };
}

export function getPlatformSettingsRaw(): PlatformSettings {
  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...readJsonFile<PlatformSettings>(FILE, DEFAULT_PLATFORM_SETTINGS),
  };
}

export function updatePlatformSettings(
  input: Partial<PlatformSettings>,
  actorId?: string | null,
): PlatformSettings {
  const current = getPlatformSettingsRaw();
  const next: PlatformSettings = {
    ...current,
    ...input,
    maintenanceMode: Boolean(input.maintenanceMode ?? current.maintenanceMode),
    allowNewSellerRegistration: Boolean(
      input.allowNewSellerRegistration ?? current.allowNewSellerRegistration,
    ),
    allowReviews: Boolean(input.allowReviews ?? current.allowReviews),
    allowReturns: Boolean(input.allowReturns ?? current.allowReturns),
    cashPaymentEnabled: Boolean(input.cashPaymentEnabled ?? current.cashPaymentEnabled),
    cardPaymentEnabled: Boolean(input.cardPaymentEnabled ?? current.cardPaymentEnabled),
    paymeEnabled: Boolean(input.paymeEnabled ?? current.paymeEnabled),
    clickEnabled: Boolean(input.clickEnabled ?? current.clickEnabled),
    smsOtpEnabled: Boolean(input.smsOtpEnabled ?? current.smsOtpEnabled),
    demoOtpAllowed: Boolean(input.demoOtpAllowed ?? current.demoOtpAllowed),
    minOrderAmount: Math.max(0, Number(input.minOrderAmount ?? current.minOrderAmount) || 0),
    maxUploadMb: Math.min(20, Math.max(1, Number(input.maxUploadMb ?? current.maxUploadMb) || 5)),
    lowStockThreshold: Math.max(0, Number(input.lowStockThreshold ?? current.lowStockThreshold) || 5),
    payoutHoldDays: Math.max(0, Number(input.payoutHoldDays ?? current.payoutHoldDays) || 0),
    updatedAt: new Date().toISOString(),
    updatedBy: actorId ?? current.updatedBy,
  };
  writeJsonFile(FILE, next);
  return next;
}

export function getPaymentGatewayStatus() {
  return {
    paymeConfigured: serverEnv.payme.isConfigured,
    clickConfigured: Boolean(serverEnv.click?.isConfigured),
    smsConfigured: serverEnv.sms.isConfigured,
    databaseConfigured: serverEnv.hasDatabase,
    adminApiLocked: serverEnv.lockAdminApi,
  };
}
