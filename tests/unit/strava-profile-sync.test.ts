import { describe, expect, it } from "vitest";
import { WEIGHT_SOURCE } from "@/lib/profile/constants";
import { stravaDetailedAthleteSchema } from "@/lib/strava/schemas";
import {
  gearFromStravaAthlete,
  nextWeightFromStrava,
  stravaWeightKg,
} from "@/lib/strava/sync-profile";

const athletePayload = {
  id: 42,
  firstname: "Ada",
  lastname: "Lovelace",
  weight: 68.4,
  bikes: [
    {
      id: "b1",
      name: "Canyon Endurace",
      primary: true,
      distance: 1_200_000,
    },
  ],
  shoes: [
    { id: "g1", name: "Pegasus", primary: true, distance: 400_000 },
    { id: "g2", name: "Vaporfly", primary: false, distance: 80_000 },
  ],
};

describe("stravaDetailedAthleteSchema", () => {
  it("parses weight, bikes, and shoes from GET /athlete", () => {
    const parsed = stravaDetailedAthleteSchema.parse(athletePayload);
    expect(parsed.id).toBe("42");
    expect(parsed.weight).toBe(68.4);
    expect(parsed.bikes).toHaveLength(1);
    expect(parsed.shoes).toHaveLength(2);
  });
});

describe("nextWeightFromStrava", () => {
  it("applies Strava weight when source is absent or strava", () => {
    expect(
      nextWeightFromStrava({ weightKg: null, weightSource: null }, 70),
    ).toEqual({ weightKg: 70, weightSource: WEIGHT_SOURCE.strava });
    expect(
      nextWeightFromStrava(
        { weightKg: 68, weightSource: WEIGHT_SOURCE.strava },
        70,
      ),
    ).toEqual({ weightKg: 70, weightSource: WEIGHT_SOURCE.strava });
  });

  it("does not overwrite a manually saved weight", () => {
    expect(
      nextWeightFromStrava(
        { weightKg: 72, weightSource: WEIGHT_SOURCE.manual },
        70,
      ),
    ).toEqual({ weightKg: 72, weightSource: WEIGHT_SOURCE.manual });
  });

  it("ignores out-of-range Strava weights", () => {
    expect(stravaWeightKg({ weight: 10 })).toBeNull();
    expect(stravaWeightKg({ weight: 250 })).toBeNull();
    expect(stravaWeightKg({ weight: null })).toBeNull();
  });
});

describe("gearFromStravaAthlete", () => {
  it("maps bikes to ride and shoes to run", () => {
    const parsed = stravaDetailedAthleteSchema.parse(athletePayload);
    const gear = gearFromStravaAthlete(parsed);
    expect(gear).toEqual([
      {
        stravaGearId: "b1",
        sport: "ride",
        kind: "bike",
        name: "Canyon Endurace",
        isPrimary: true,
        distanceM: 1_200_000,
      },
      {
        stravaGearId: "g1",
        sport: "run",
        kind: "shoes",
        name: "Pegasus",
        isPrimary: true,
        distanceM: 400_000,
      },
      {
        stravaGearId: "g2",
        sport: "run",
        kind: "shoes",
        name: "Vaporfly",
        isPrimary: false,
        distanceM: 80_000,
      },
    ]);
  });
});
