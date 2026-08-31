import { describe, expect, it } from "vitest";
import {
  isLlmQuotaExceeded,
  LLM_GENERATE_PROGRAM_MAX_PER_HOUR,
} from "@/lib/llm/quota";

describe("isLlmQuotaExceeded", () => {
  it("allows calls below the hourly cap", () => {
    expect(isLlmQuotaExceeded(0)).toBe(false);
    expect(isLlmQuotaExceeded(LLM_GENERATE_PROGRAM_MAX_PER_HOUR - 1)).toBe(
      false,
    );
  });

  it("blocks at the hourly cap", () => {
    expect(isLlmQuotaExceeded(LLM_GENERATE_PROGRAM_MAX_PER_HOUR)).toBe(true);
    expect(isLlmQuotaExceeded(LLM_GENERATE_PROGRAM_MAX_PER_HOUR + 2)).toBe(
      true,
    );
  });

  it("accepts a custom cap for feedback analysis", () => {
    expect(isLlmQuotaExceeded(19, 20)).toBe(false);
    expect(isLlmQuotaExceeded(20, 20)).toBe(true);
  });

  it("accepts a custom cap for performance reports", () => {
    expect(isLlmQuotaExceeded(4, 5)).toBe(false);
    expect(isLlmQuotaExceeded(5, 5)).toBe(true);
  });
});
