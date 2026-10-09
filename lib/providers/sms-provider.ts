import { createHash } from "node:crypto";
import { allowSmsMock, ProviderMockForbiddenError } from "@/lib/providers/errors";
import { log } from "@/lib/log";
import { toSmsPhone } from "@/lib/phone";

export type SmsSendResult = {
  ok: boolean;
  provider: string;
  messageId: string;
  error?: string;
};

export interface SmsProvider {
  name: string;
  sendOtp(phone: string, code: string): Promise<SmsSendResult>;
}

type EskizLoginResponse = {
  data?: { token?: string };
};

export class MockSmsProvider implements SmsProvider {
  name = "mock";

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    const appEnv = process.env.APP_ENV ?? "development";
    if (!allowSmsMock(appEnv)) {
      throw new ProviderMockForbiddenError("sms");
    }
    const hint = createHash("sha256").update(code).digest("hex").slice(0, 8);
    log.info("sms.mock", "OTP yuborildi (demo, kod logda yo‘q)", {
      phoneSuffix: phone.slice(-4),
      codeHash8: hint,
    });
    return { ok: true, provider: this.name, messageId: `mock-${Date.now()}` };
  }
}

export class EskizSmsProvider implements SmsProvider {
  name = "eskiz";
  private token: string | null = null;
  private tokenAt = 0;
  private readonly apiUrl: string;
  private readonly login: string;
  private readonly password: string;
  private readonly senderName: string;
  private readonly ttlMinutes: number;

  constructor(
    apiUrl: string,
    login: string,
    password: string,
    senderName: string,
    ttlMinutes: number,
  ) {
    this.apiUrl = apiUrl;
    this.login = login;
    this.password = password;
    this.senderName = senderName;
    this.ttlMinutes = ttlMinutes;
  }

  private async auth(): Promise<string | null> {
    if (this.token && Date.now() - this.tokenAt < 50 * 60 * 1000) return this.token;
    const loginResponse = await fetch(`${this.apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.login, password: this.password }),
    });
    if (!loginResponse.ok) return null;
    const loginData = (await loginResponse.json()) as EskizLoginResponse;
    const token = loginData.data?.token;
    if (!token) return null;
    this.token = token;
    this.tokenAt = Date.now();
    return token;
  }

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    const token = await this.auth();
    if (!token) {
      log.warn("sms.eskiz", "login muvaffaqiyatsiz");
      return { ok: false, provider: this.name, messageId: "", error: "SMS provayderiga ulanib bo'lmadi" };
    }

    const message = `${this.senderName} tasdiqlash kodi: ${code}. Kod ${this.ttlMinutes} daqiqa amal qiladi.`;
    const sendResponse = await fetch(`${this.apiUrl}/message/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mobile_phone: toSmsPhone(phone),
        message,
        from: this.senderName,
      }),
    });

    if (!sendResponse.ok) {
      log.warn("sms.eskiz", "send HTTP xato", { status: sendResponse.status });
      return {
        ok: false,
        provider: this.name,
        messageId: "",
        error: "SMS yuborishda xatolik yuz berdi",
      };
    }

    return { ok: true, provider: this.name, messageId: `eskiz-${Date.now()}` };
  }
}

let current: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (current) return current;
  const appEnv = process.env.APP_ENV ?? "development";
  const requested = (process.env.SMS_PROVIDER ?? "").trim().toLowerCase();
  const apiUrl = process.env.SMS_API_URL?.trim();
  const login = (process.env.SMS_API_EMAIL ?? process.env.SMS_LOGIN ?? "").trim();
  const password = (process.env.SMS_API_PASSWORD ?? process.env.SMS_PASSWORD ?? "").trim();
  const sender = process.env.SMS_SENDER_NAME?.trim() || "TAVFIQ";
  const ttl = Number(process.env.OTP_TTL_MINUTES ?? 5) || 5;
  const configured = Boolean(apiUrl && login && password);

  if (requested === "mock") {
    current = new MockSmsProvider();
    return current;
  }

  if (configured && (requested === "eskiz" || requested === "" || requested === "auto")) {
    current = new EskizSmsProvider(apiUrl!, login, password, sender, ttl);
    return current;
  }

  if (!allowSmsMock(appEnv)) {
    current = {
      name: "disabled",
      async sendOtp(): Promise<SmsSendResult> {
        throw new ProviderMockForbiddenError("sms");
      },
    };
    return current;
  }

  current = new MockSmsProvider();
  return current;
}

export function setSmsProvider(provider: SmsProvider) {
  current = provider;
}

export function resetSmsProviderForTests() {
  current = null;
}
