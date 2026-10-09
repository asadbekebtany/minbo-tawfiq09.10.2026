export type ApiErrorBody = {
  success: false;
  code: string;
  message: string;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }

  toJSON(): ApiErrorBody {
    return { success: false, code: this.code, message: this.message };
  }
}

export function apiErrorResponse(error: unknown, fallback = "Kutilmagan xatolik") {
  if (error instanceof ApiError) {
    return { body: error.toJSON(), status: error.status };
  }
  const message = error instanceof Error ? error.message : fallback;
  return {
    body: { success: false as const, code: "INTERNAL_ERROR", message },
    status: 500,
  };
}
