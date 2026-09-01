import { prisma } from "@/lib/prisma";
import {
  WEIGHT_KG_MAX,
  WEIGHT_KG_MIN,
  WEIGHT_SOURCE,
} from "@/lib/profile/constants";
import type { StravaDetailedAthlete } from "@/lib/strava/schemas";

export type ProfileWeightState = {
  weightKg: number | null;
  weightSource: string | null;
};

export type SyncedStravaGear = {
  stravaGearId: string;
  sport: "run" | "ride";
  kind: "shoes" | "bike";
  name: string;
  isPrimary: boolean;
  distanceM: number | null;
};

export function shouldApplyStravaWeight(
  weightSource: string | null | undefined,
): boolean {
  return weightSource !== WEIGHT_SOURCE.manual;
}

export function nextWeightFromStrava(
  current: ProfileWeightState,
  stravaWeightKg: number | null,
): ProfileWeightState {
  if (
    stravaWeightKg == null ||
    !shouldApplyStravaWeight(current.weightSource)
  ) {
    return current;
  }
  return {
    weightKg: stravaWeightKg,
    weightSource: WEIGHT_SOURCE.strava,
  };
}

export function stravaWeightKg(
  athlete: Pick<StravaDetailedAthlete, "weight">,
): number | null {
  const weight = athlete.weight;
  if (typeof weight !== "number" || !Number.isFinite(weight)) {
    return null;
  }
  if (weight < WEIGHT_KG_MIN || weight > WEIGHT_KG_MAX) {
    return null;
  }
  return weight;
}

export function gearFromStravaAthlete(
  athlete: Pick<StravaDetailedAthlete, "bikes" | "shoes">,
): SyncedStravaGear[] {
  const bikes = (athlete.bikes ?? []).map((bike) => ({
    stravaGearId: bike.id,
    sport: "ride" as const,
    kind: "bike" as const,
    name: bike.name,
    isPrimary: Boolean(bike.primary),
    distanceM: typeof bike.distance === "number" ? bike.distance : null,
  }));
  const shoes = (athlete.shoes ?? []).map((shoe) => ({
    stravaGearId: shoe.id,
    sport: "run" as const,
    kind: "shoes" as const,
    name: shoe.name,
    isPrimary: Boolean(shoe.primary),
    distanceM: typeof shoe.distance === "number" ? shoe.distance : null,
  }));
  return [...bikes, ...shoes];
}

export async function persistStravaAthleteProfile(
  userId: string,
  athlete: StravaDetailedAthlete,
  now: Date = new Date(),
): Promise<void> {
  const existing = await prisma.userProfile.findUnique({
    where: { userId },
    select: { weightKg: true, weightSource: true },
  });
  const weight = nextWeightFromStrava(
    {
      weightKg: existing?.weightKg ?? null,
      weightSource: existing?.weightSource ?? null,
    },
    stravaWeightKg(athlete),
  );
  const gearItems = gearFromStravaAthlete(athlete);

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        weightKg: weight.weightKg,
        weightSource: weight.weightSource,
        lastStravaSyncedAt: now,
      },
      update: {
        weightKg: weight.weightKg,
        weightSource: weight.weightSource,
        lastStravaSyncedAt: now,
      },
    });

    for (const item of gearItems) {
      if (item.isPrimary) {
        await tx.gear.updateMany({
          where: {
            userId,
            sport: item.sport,
            kind: item.kind,
            isPrimary: true,
          },
          data: { isPrimary: false },
        });
      }

      const current = await tx.gear.findFirst({
        where: { userId, stravaGearId: item.stravaGearId },
      });
      if (current) {
        await tx.gear.update({
          where: { id: current.id },
          data: {
            name: item.name,
            distanceM: item.distanceM,
            isPrimary: item.isPrimary,
            sport: item.sport,
            kind: item.kind,
          },
        });
      } else {
        await tx.gear.create({
          data: {
            userId,
            ...item,
          },
        });
      }
    }
  });
}
