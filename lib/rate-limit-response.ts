import { NextResponse } from "next/server";
import type { RateLimitCheckResult } from "@/lib/rate-limit";

export function rateLimitExceededResponse(
  result: Extract<RateLimitCheckResult, { allowed: false }>,
) {
  return NextResponse.json(
    {
      error: result.message,
      retryAfterSec: result.retryAfterSec,
      rateLimited: true,
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSec) },
    },
  );
}
