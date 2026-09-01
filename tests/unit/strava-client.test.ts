import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAthlete, listAthleteActivities } from "@/lib/strava/client";
import { STRAVA_API_BASE } from "@/lib/strava/constants";
import { StravaRateLimitError } from "@/lib/strava/errors";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Strava API client", () => {
  it("requests a paginated activity list with the access token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "X-RateLimit-Limit": "200,2000",
        "X-RateLimit-Usage": "3,3",
      }),
      json: async () => [{ id: 1 }, { id: 2 }],
    });

    const page = await listAthleteActivities(
      { accessToken: "tok", page: 2, perPage: 50, after: 1_700_000_000 },
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toBe(
      `${STRAVA_API_BASE}/athlete/activities?page=2&per_page=50&after=1700000000`,
    );
    const init = fetchImpl.mock.calls[0]?.[1] as {
      headers: { Authorization: string };
    };
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(page.payloads).toHaveLength(2);
  });

  it("requests GET /athlete with the access token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "X-RateLimit-Limit": "200,2000",
        "X-RateLimit-Usage": "3,3",
      }),
      json: async () => ({ id: 42, weight: 70, bikes: [], shoes: [] }),
    });

    const payload = await fetchAthlete("tok", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
      `${STRAVA_API_BASE}/athlete`,
    );
    expect(payload).toEqual({ id: 42, weight: 70, bikes: [], shoes: [] });
  });

  it("throws StravaRateLimitError on HTTP 429", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "15" }),
      json: async () => ({}),
    });

    await expect(
      listAthleteActivities({ accessToken: "tok", page: 1 }, fetchImpl),
    ).rejects.toBeInstanceOf(StravaRateLimitError);
  });
});
