import { STRAVA_SHORT_RATE_WINDOW_MS } from "@/lib/strava/constants";

export type RateLimitState = {
  shortLimit: number;
  shortUsage: number;
  longLimit: number;
  longUsage: number;
};

function parsePair(value: string | null): [number, number] | null {
  if (!value) {
    return null;
  }
  const [first, second] = value.split(",").map((part) => Number(part.trim()));
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }
  return [first, second];
}

export function parseRateLimitHeaders(headers: Headers): RateLimitState | null {
  const limit = parsePair(
    headers.get("X-RateLimit-Limit") ?? headers.get("x-ratelimit-limit"),
  );
  const usage = parsePair(
    headers.get("X-RateLimit-Usage") ?? headers.get("x-ratelimit-usage"),
  );
  if (!limit || !usage) {
    return null;
  }
  return {
    shortLimit: limit[0],
    longLimit: limit[1],
    shortUsage: usage[0],
    longUsage: usage[1],
  };
}

export function isRateLimitNearlyExhausted(
  state: RateLimitState,
  reserve = 2,
): boolean {
  return (
    state.shortUsage >= state.shortLimit - reserve ||
    state.longUsage >= state.longLimit - reserve
  );
}

export function rateLimitRetryAt(
  state: RateLimitState | null,
  now = Date.now(),
): number {
  if (state && state.longUsage >= state.longLimit) {
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 0, 0);
    return tomorrow.getTime();
  }
  return (
    Math.ceil((now + 1) / STRAVA_SHORT_RATE_WINDOW_MS) *
    STRAVA_SHORT_RATE_WINDOW_MS
  );
}

export function parseRetryAfterMs(
  headers: Headers,
  fallbackMs: number,
): number {
  const raw = headers.get("Retry-After") ?? headers.get("retry-after");
  if (!raw) {
    return fallbackMs;
  }
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const date = Date.parse(raw);
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now());
  }
  return fallbackMs;
}
