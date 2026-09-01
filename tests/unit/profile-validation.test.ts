import { describe, expect, it } from "vitest";
import {
  createGearFormSchema,
  updateProfileFormSchema,
} from "@/lib/validation/profile";

describe("updateProfileFormSchema", () => {
  it("accepts empty optional fields", () => {
    const parsed = updateProfileFormSchema.safeParse({
      weightKg: "",
      heightCm: "",
      birthDate: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.weightKg).toBeUndefined();
      expect(parsed.data.heightCm).toBeUndefined();
      expect(parsed.data.birthDate).toBeUndefined();
    }
  });

  it("accepts values in range", () => {
    const parsed = updateProfileFormSchema.safeParse({
      weightKg: "72.5",
      heightCm: "178",
      birthDate: "1990-06-15",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.weightKg).toBe(72.5);
      expect(parsed.data.heightCm).toBe(178);
      expect(parsed.data.birthDate).toBe("1990-06-15");
    }
  });

  it("rejects weight and height outside range", () => {
    expect(updateProfileFormSchema.safeParse({ weightKg: 20 }).success).toBe(
      false,
    );
    expect(updateProfileFormSchema.safeParse({ weightKg: 250 }).success).toBe(
      false,
    );
    expect(updateProfileFormSchema.safeParse({ heightCm: 100 }).success).toBe(
      false,
    );
    expect(updateProfileFormSchema.safeParse({ heightCm: 250 }).success).toBe(
      false,
    );
  });

  it("rejects birth dates that imply an age outside 13–90", () => {
    expect(
      updateProfileFormSchema.safeParse({ birthDate: "2024-01-01" }).success,
    ).toBe(false);
    expect(
      updateProfileFormSchema.safeParse({ birthDate: "1920-01-01" }).success,
    ).toBe(false);
  });
});

describe("createGearFormSchema", () => {
  it("allows shoes for run and bike for ride", () => {
    expect(
      createGearFormSchema.safeParse({
        sport: "run",
        kind: "shoes",
        name: "Pegasus",
        isPrimary: "on",
      }).success,
    ).toBe(true);
    expect(
      createGearFormSchema.safeParse({
        sport: "ride",
        kind: "bike",
        name: "Canyon",
        isPrimary: false,
      }).success,
    ).toBe(true);
  });

  it("rejects kind/sport mismatches", () => {
    expect(
      createGearFormSchema.safeParse({
        sport: "run",
        kind: "bike",
        name: "Wrong",
      }).success,
    ).toBe(false);
    expect(
      createGearFormSchema.safeParse({
        sport: "swim",
        kind: "shoes",
        name: "Wrong",
      }).success,
    ).toBe(false);
    expect(
      createGearFormSchema.safeParse({
        sport: "ride",
        kind: "shoes",
        name: "Wrong",
      }).success,
    ).toBe(false);
  });

  it("allows accessories for every sport", () => {
    for (const sport of ["run", "swim", "ride"] as const) {
      expect(
        createGearFormSchema.safeParse({
          sport,
          kind: "accessory",
          name: "Fascia HR",
        }).success,
      ).toBe(true);
    }
  });

  it("rejects an empty name", () => {
    expect(
      createGearFormSchema.safeParse({
        sport: "run",
        kind: "shoes",
        name: "  ",
      }).success,
    ).toBe(false);
  });
});
