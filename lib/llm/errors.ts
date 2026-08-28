export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMConfigError";
  }
}

export class LLMApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "LLMApiError";
    this.status = status;
  }
}

export class LLMRateLimitError extends LLMApiError {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number, message = "Rate limit LLM raggiunto") {
    super(message, 429);
    this.name = "LLMRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class LLMTimeoutError extends LLMApiError {
  constructor(message = "Timeout della richiesta LLM") {
    super(message);
    this.name = "LLMTimeoutError";
  }
}

export class LLMParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMParseError";
  }
}
