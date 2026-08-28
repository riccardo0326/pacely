import { describe, expect, it } from "vitest";
import {
  isRateLimitNearlyExhausted,
  parseRateLimitHeaders,
  parseRetryAfterMs,
  rateLimitRetryAt,
} from "@/lib/strava/rate-limit";

describe("Strava rate limit helpers", () => {
  it("parses X-RateLimit headers", () => {
    const headers = new Headers({
      "X-RateLimit-Limit": "200,2000",
      "X-RateLimit-Usage": "198,400",
    });
    expect(parseRateLimitHeaders(headers)).toEqual({
      shortLimit: 200,
      longLimit: 2000,
      shortUsage: 198,
      longUsage: 400,
    });
  });

  it("treats usage within the reserve as exhausted", () => {
    expect(
      isRateLimitNearlyExhausted({
        shortLimit: 200,
        shortUsage: 198,
        longLimit: 2000,
        longUsage: 10,
      }),
    ).toBe(true);
    expect(
      isRateLimitNearlyExhausted({
        shortLimit: 200,
        shortUsage: 10,
        longLimit: 2000,
        longUsage: 10,
      }),
    ).toBe(false);
  });

  it("waits until UTC midnight when the daily quota is spent", () => {
    const now = Date.parse("2026-08-28T10:00:00Z");
    const retryAt = rateLimitRetryAt(
      {
        shortLimit: 200,
        shortUsage: 1,
        longLimit: 2000,
        longUsage: 2000,
      },
      now,
    );
    expect(new Date(retryAt).toISOString()).toBe("2026-08-29T00:00:00.000Z");
  });

  it("reads Retry-After seconds", () => {
    const headers = new Headers({ "Retry-After": "90" });
    expect(parseRetryAfterMs(headers, 1000)).toBe(90_000);
  });
});
