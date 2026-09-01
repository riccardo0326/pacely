export const WEIGHT_SOURCE = {
  strava: "strava",
  manual: "manual",
} as const;
export type WeightSource = (typeof WEIGHT_SOURCE)[keyof typeof WEIGHT_SOURCE];

export const GEAR_KIND = {
  shoes: "shoes",
  bike: "bike",
  accessory: "accessory",
} as const;
export type GearKind = (typeof GEAR_KIND)[keyof typeof GEAR_KIND];

export const GEAR_KIND_OPTIONS = [
  GEAR_KIND.shoes,
  GEAR_KIND.bike,
  GEAR_KIND.accessory,
] as const;

export const GEAR_KIND_LABELS: Record<GearKind, string> = {
  shoes: "Scarpe",
  bike: "Bici",
  accessory: "Accessorio",
};

export const WEIGHT_KG_MIN = 30;
export const WEIGHT_KG_MAX = 200;
export const HEIGHT_CM_MIN = 120;
export const HEIGHT_CM_MAX = 230;
export const AGE_YEARS_MIN = 13;
export const AGE_YEARS_MAX = 90;
export const GEAR_NAME_MAX = 80;

export function allowedGearKinds(sport: "run" | "swim" | "ride"): GearKind[] {
  if (sport === "run") {
    return [GEAR_KIND.shoes, GEAR_KIND.accessory];
  }
  if (sport === "ride") {
    return [GEAR_KIND.bike, GEAR_KIND.accessory];
  }
  return [GEAR_KIND.accessory];
}

export function isGearKind(value: string): value is GearKind {
  return (GEAR_KIND_OPTIONS as readonly string[]).includes(value);
}

export function isGearKindAllowed(
  sport: "run" | "swim" | "ride",
  kind: string,
): kind is GearKind {
  return allowedGearKinds(sport).includes(kind as GearKind);
}
