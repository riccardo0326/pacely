import type { Sport } from "@/lib/strava/constants";

const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const RIDE_TYPES = new Set([
  "Ride",
  "VirtualRide",
  "GravelRide",
  "MountainBikeRide",
]);
const SWIM_TYPES = new Set(["Swim", "OpenWaterSwim"]);

function mapOne(candidate: string): Sport | null {
  if (RUN_TYPES.has(candidate)) {
    return "run";
  }
  if (RIDE_TYPES.has(candidate)) {
    return "ride";
  }
  if (SWIM_TYPES.has(candidate)) {
    return "swim";
  }
  return null;
}

export function mapStravaSport(
  sportType?: string | null,
  type?: string | null,
): Sport | null {
  if (sportType) {
    return mapOne(sportType);
  }
  if (type) {
    return mapOne(type);
  }
  return null;
}
