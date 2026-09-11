export function formatActivityDistance(
  distanceM: number | null,
  sport: string,
): string {
  if (distanceM == null) {
    return "—";
  }
  if (sport === "swim") {
    return `${Math.round(distanceM)} m`;
  }
  return `${(distanceM / 1000).toFixed(1)} km`;
}

export function formatActivityDuration(durationSec: number): string {
  const minutes = Math.round(durationSec / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
