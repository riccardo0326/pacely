export class StravaAuthError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "StravaAuthError";
    this.status = status;
  }
}

export class StravaApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StravaApiError";
    this.status = status;
  }
}

export class StravaRateLimitError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number, message = "Rate limit Strava raggiunto") {
    super(message);
    this.name = "StravaRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}
