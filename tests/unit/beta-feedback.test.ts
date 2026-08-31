import { describe, expect, it } from "vitest";
import { betaFeedbackFormSchema } from "@/lib/validation/beta-feedback";

describe("betaFeedbackFormSchema", () => {
  it("accepts a valid bug report", () => {
    const parsed = betaFeedbackFormSchema.safeParse({
      category: "bug",
      message: "Il calendario non mostra il workout di oggi dopo il match.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a short message and unknown category", () => {
    expect(
      betaFeedbackFormSchema.safeParse({
        category: "bug",
        message: "corto",
      }).success,
    ).toBe(false);
    expect(
      betaFeedbackFormSchema.safeParse({
        category: "coach",
        message: "Vorrei gestire più atleti dalla stessa dashboard.",
      }).success,
    ).toBe(false);
  });
});
