export function formatPace(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) {
    return "—";
  }
  const rounded = Math.round(totalSec);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatWatts(watts: number): string {
  return `${Math.round(watts)} W`;
}

export function formatZoneBound(
  value: number,
  unit: "watts" | "secPerKm" | "secPer100m" | "bpm",
): string {
  switch (unit) {
    case "watts":
      return `${Math.round(value)} W`;
    case "bpm":
      return `${Math.round(value)} bpm`;
    case "secPerKm":
      return `${formatPace(value)} /km`;
    case "secPer100m":
      return `${formatPace(value)} /100m`;
  }
}
