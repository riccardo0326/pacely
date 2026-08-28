export class StravaAuthError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "StravaAuthError";
    this.status = status;
  }
}
