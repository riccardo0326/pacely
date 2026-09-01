import { afterEach, describe, expect, it, vi } from "vitest";
import { stravaDetailedAthleteSchema } from "@/lib/strava/schemas";
import { WEIGHT_SOURCE } from "@/lib/profile/constants";

const mocks = vi.hoisted(() => ({
  profileFindUnique: vi.fn(),
  profileUpsert: vi.fn(),
  gearFindFirst: vi.fn(),
  gearCreate: vi.fn(),
  gearUpdate: vi.fn(),
  gearUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const prisma = {
    userProfile: {
      findUnique: mocks.profileFindUnique,
      upsert: mocks.profileUpsert,
    },
    gear: {
      findFirst: mocks.gearFindFirst,
      create: mocks.gearCreate,
      update: mocks.gearUpdate,
      updateMany: mocks.gearUpdateMany,
    },
    $transaction: mocks.transaction,
  };
  return { prisma };
});

import { persistStravaAthleteProfile } from "@/lib/strava/sync-profile";

afterEach(() => {
  vi.clearAllMocks();
});

describe("persistStravaAthleteProfile", () => {
  it("upserts profile weight from Strava and creates gear", async () => {
    mocks.profileFindUnique.mockResolvedValue(null);
    mocks.gearFindFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => {
        const tx = {
          userProfile: { upsert: mocks.profileUpsert },
          gear: {
            findFirst: mocks.gearFindFirst,
            create: mocks.gearCreate,
            update: mocks.gearUpdate,
            updateMany: mocks.gearUpdateMany,
          },
        };
        return fn(tx);
      },
    );

    const athlete = stravaDetailedAthleteSchema.parse({
      id: 99,
      weight: 71.2,
      bikes: [{ id: "b9", name: "Trek", primary: true, distance: 5000 }],
      shoes: [],
    });

    await persistStravaAthleteProfile("user-1", athlete);

    expect(mocks.profileFindUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { weightKg: true, weightSource: true },
    });
    expect(mocks.profileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        create: expect.objectContaining({
          userId: "user-1",
          weightKg: 71.2,
          weightSource: WEIGHT_SOURCE.strava,
        }),
      }),
    );
    expect(mocks.gearCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        stravaGearId: "b9",
        sport: "ride",
        kind: "bike",
        name: "Trek",
        isPrimary: true,
        distanceM: 5000,
      }),
    });
  });

  it("updates existing Strava gear instead of duplicating it", async () => {
    mocks.profileFindUnique.mockResolvedValue({
      weightKg: 70,
      weightSource: WEIGHT_SOURCE.manual,
    });
    mocks.gearFindFirst.mockResolvedValue({ id: "gear-1" });
    mocks.transaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => {
        const tx = {
          userProfile: { upsert: mocks.profileUpsert },
          gear: {
            findFirst: mocks.gearFindFirst,
            create: mocks.gearCreate,
            update: mocks.gearUpdate,
            updateMany: mocks.gearUpdateMany,
          },
        };
        return fn(tx);
      },
    );

    const athlete = stravaDetailedAthleteSchema.parse({
      id: 99,
      weight: 80,
      bikes: [
        { id: "b9", name: "Trek Domane", primary: false, distance: 9000 },
      ],
      shoes: [],
    });

    await persistStravaAthleteProfile("user-1", athlete);

    const upsert = mocks.profileUpsert.mock.calls[0]?.[0] as {
      update: { weightKg: number | null; weightSource: string | null };
    };
    expect(upsert.update.weightKg).toBe(70);
    expect(upsert.update.weightSource).toBe(WEIGHT_SOURCE.manual);
    expect(mocks.gearUpdate).toHaveBeenCalledWith({
      where: { id: "gear-1" },
      data: expect.objectContaining({
        name: "Trek Domane",
        distanceM: 9000,
        isPrimary: false,
        sport: "ride",
        kind: "bike",
      }),
    });
    expect(mocks.gearCreate).not.toHaveBeenCalled();
  });
});
