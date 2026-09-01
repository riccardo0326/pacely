import {
  STRAVA_ACTIVITIES_PER_PAGE,
  STRAVA_API_BASE,
  STRAVA_REQUEST_TIMEOUT_MS,
} from "@/lib/strava/constants";
import { StravaApiError, StravaRateLimitError } from "@/lib/strava/errors";
import {
  isRateLimitNearlyExhausted,
  parseRateLimitHeaders,
  parseRetryAfterMs,
  rateLimitRetryAt,
  type RateLimitState,
} from "@/lib/strava/rate-limit";

export type ListActivitiesParams = {
  accessToken: string;
  page: number;
  perPage?: number;
  after?: number;
};

export type StravaListPage = {
  payloads: unknown[];
  rateLimit: RateLimitState | null;
};

const MAX_5XX_RETRIES = 2;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function throwIfRateLimited(headers: Headers, status: number): void {
  const rateLimit = parseRateLimitHeaders(headers);
  if (
    status === 429 ||
    (rateLimit && isRateLimitNearlyExhausted(rateLimit, 0))
  ) {
    const fallback = rateLimitRetryAt(rateLimit) - Date.now();
    throw new StravaRateLimitError(
      parseRetryAfterMs(headers, Math.max(fallback, 1_000)),
    );
  }
}

async function stravaGet(
  path: string,
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<{ json: unknown; headers: Headers }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_5XX_RETRIES; attempt += 1) {
    const response = await fetchImpl(`${STRAVA_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(STRAVA_REQUEST_TIMEOUT_MS),
    });

    if (response.status === 429) {
      throwIfRateLimited(response.headers, response.status);
    }

    if (response.status >= 500) {
      lastError = new StravaApiError(
        `Strava ha restituito ${response.status}`,
        response.status,
      );
      if (attempt < MAX_5XX_RETRIES) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw lastError;
    }

    if (!response.ok) {
      throw new StravaApiError(
        `Richiesta Strava fallita (${response.status})`,
        response.status,
      );
    }

    const rateLimit = parseRateLimitHeaders(response.headers);
    if (rateLimit && isRateLimitNearlyExhausted(rateLimit)) {
      const retryAt = rateLimitRetryAt(rateLimit);
      throw new StravaRateLimitError(Math.max(retryAt - Date.now(), 1_000));
    }

    return { json: await response.json(), headers: response.headers };
  }

  throw lastError instanceof Error
    ? lastError
    : new StravaApiError("Richiesta Strava fallita", 500);
}

export async function listAthleteActivities(
  params: ListActivitiesParams,
  fetchImpl: typeof fetch = fetch,
): Promise<StravaListPage> {
  const search = new URLSearchParams({
    page: String(params.page),
    per_page: String(params.perPage ?? STRAVA_ACTIVITIES_PER_PAGE),
  });
  if (typeof params.after === "number") {
    search.set("after", String(params.after));
  }

  const { json, headers } = await stravaGet(
    `/athlete/activities?${search.toString()}`,
    params.accessToken,
    fetchImpl,
  );

  if (!Array.isArray(json)) {
    throw new StravaApiError("Elenco attività Strava non valido", 502);
  }

  return { payloads: json, rateLimit: parseRateLimitHeaders(headers) };
}

export async function fetchStravaActivity(
  accessToken: string,
  stravaActivityId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const { json } = await stravaGet(
    `/activities/${encodeURIComponent(stravaActivityId)}`,
    accessToken,
    fetchImpl,
  );
  return json;
}

export async function fetchAthlete(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const { json } = await stravaGet("/athlete", accessToken, fetchImpl);
  return json;
}
