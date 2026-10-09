export class ProviderNotConfiguredError extends Error {
  readonly code = "PROVIDER_NOT_CONFIGURED";
  readonly status = 503;

  constructor(provider: string) {
    super(`${provider} credentiallari sozlanmagan`);
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderMockForbiddenError extends Error {
  readonly code = "PROVIDER_MOCK_FORBIDDEN";
  readonly status = 403;

  constructor(provider: string) {
    super(`${provider} mock productionda taqiqlangan`);
    this.name = "ProviderMockForbiddenError";
  }
}

export class WebhookAuthError extends Error {
  readonly code = "WEBHOOK_AUTH_FAILED";
  readonly status = 401;

  constructor(provider: string) {
    super(`${provider} webhook imzo/auth noto‘g‘ri yoki yo‘q`);
    this.name = "WebhookAuthError";
  }
}

export function allowPaymentMocks(appEnv: string): boolean {
  return appEnv !== "production";
}

export function allowSmsMock(appEnv: string): boolean {
  return appEnv !== "production";
}
