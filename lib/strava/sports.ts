import type { ActivitySport, Sport } from "@/lib/strava/constants";

const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const RIDE_TYPES = new Set([
  "Ride",
  "VirtualRide",
  "GravelRide",
  "MountainBikeRide",
]);
const SWIM_TYPES = new Set(["Swim", "OpenWaterSwim"]);
const EXTRA_LOAD_TYPES = new Set([
  "Hike",
  "Walk",
  "Hiking",
  "Workout",
  "Yoga",
  "WeightTraining",
  "RockClimbing",
  "Snowboard",
  "AlpineSki",
  "BackcountrySki",
  "NordicSki",
  "Kayaking",
  "Canoeing",
  "Rowing",
  "Elliptical",
  "StairStepper",
  "IceSkate",
  "Snowshoe",
  "StandUpPaddling",
  "Surfing",
  "Kitesurf",
  "Golf",
  "Soccer",
  "Tennis",
  "Crossfit",
  "HighIntensityIntervalTraining",
  "Pilates",
]);

function mapOne(candidate: string): ActivitySport | null {
  if (RUN_TYPES.has(candidate)) {
    return "run";
  }
  if (RIDE_TYPES.has(candidate)) {
    return "ride";
  }
  if (SWIM_TYPES.has(candidate)) {
    return "swim";
  }
  if (EXTRA_LOAD_TYPES.has(candidate)) {
    return "other";
  }
  return null;
}

export function mapStravaSport(
  sportType?: string | null,
  type?: string | null,
): ActivitySport | null {
  if (sportType) {
    return mapOne(sportType);
  }
  if (type) {
    return mapOne(type);
  }
  return null;
}

export function isTrainingSport(sport: string): sport is Sport {
  return sport === "run" || sport === "swim" || sport === "ride";
}
