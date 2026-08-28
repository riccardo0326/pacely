import { describe, expect, it } from "vitest";
import { authorizeCronRequest } from "@/lib/cron";

describe("cron authorization", () => {
  it("accepts a matching Bearer token", () => {
    process.env.CRON_SECRET = "cron-secret";
    const request = new Request("http://localhost/api/cron/strava-sync", {
      headers: { Authorization: "Bearer cron-secret" },
    });
    expect(authorizeCronRequest(request)).toBe(true);
  });

  it("rejects a missing or wrong token", () => {
    process.env.CRON_SECRET = "cron-secret";
    expect(authorizeCronRequest(new Request("http://localhost/x"))).toBe(false);
    expect(
      authorizeCronRequest(
        new Request("http://localhost/x", {
          headers: { Authorization: "Bearer other" },
        }),
      ),
    ).toBe(false);
  });
});
