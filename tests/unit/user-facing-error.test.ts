import { describe, expect, it } from "vitest";
import { USER_FACING_ERROR, toUserFacingError } from "@/lib/errors/user-facing";
import { LlmQuotaExceededError } from "@/lib/llm/quota";

describe("toUserFacingError", () => {
  it("keeps quota messages", () => {
    expect(
      toUserFacingError(new LlmQuotaExceededError("Troppe chiamate")),
    ).toBe("Troppe chiamate");
  });

  it("does not leak internal Error messages", () => {
    expect(toUserFacingError(new Error("ECONNRESET prisma"))).toBe(
      USER_FACING_ERROR.generic,
    );
    expect(
      toUserFacingError(new Error("secret"), USER_FACING_ERROR.generateProgram),
    ).toBe(USER_FACING_ERROR.generateProgram);
  });
});
