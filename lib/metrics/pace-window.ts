import { formatPace } from "@/lib/metrics/format";
import { thresholdSpeedMpsFromVdot } from "@/lib/metrics/vdot";

const MIN_WIDTH_SEC = 15;
const MAX_WIDTH_SEC = 30;
/** Open-ended Z1/Z5 get a 20 s window instead of an unbounded range. */
const OPEN_ZONE_WIDTH_SEC = 20;

export type PaceWindow = {
  minSecPerKm: number;
  maxSecPerKm: number;
};

function clampWindow(faster: number, slower: number): PaceWindow {
  const width = slower - faster;
  if (width > MAX_WIDTH_SEC) {
    const mid = (faster + slower) / 2;
    return {
      minSecPerKm: mid - MAX_WIDTH_SEC / 2,
      maxSecPerKm: mid + MAX_WIDTH_SEC / 2,
    };
  }
  if (width < MIN_WIDTH_SEC) {
    const mid = (faster + slower) / 2;
    return {
      minSecPerKm: mid - MIN_WIDTH_SEC / 2,
      maxSecPerKm: mid + MIN_WIDTH_SEC / 2,
    };
  }
  return { minSecPerKm: faster, maxSecPerKm: slower };
}

/**
 * Training pace window for a run zone. `minSecPerKm` is the faster bound.
 * Width is clamped to 15–30 s/km so the athlete sees a usable target, not the
 * full VDOT zone (Z2 is often ~40–50 s wide).
 */
export function paceWindowForZone(
  zone: number,
  thresholdMps: number,
): PaceWindow | null {
  if (!Number.isInteger(zone) || zone < 1 || zone > 5 || thresholdMps <= 0) {
    return null;
  }
  const tSecPerKm = 1000 / thresholdMps;
  if (zone === 1) {
    const faster = tSecPerKm * 1.29;
    return clampWindow(faster, faster + OPEN_ZONE_WIDTH_SEC);
  }
  if (zone === 2) {
    return clampWindow(tSecPerKm * 1.14, tSecPerKm * 1.29);
  }
  if (zone === 3) {
    return clampWindow(tSecPerKm * 1.06, tSecPerKm * 1.14);
  }
  if (zone === 4) {
    return clampWindow(tSecPerKm * 0.99, tSecPerKm * 1.06);
  }
  const slower = tSecPerKm * 0.99;
  return clampWindow(Math.max(1, slower - OPEN_ZONE_WIDTH_SEC), slower);
}

/** Slower bound first, e.g. `7:30–7:45 /km`. */
export function formatPaceWindow(window: PaceWindow): string {
  return `${formatPace(window.maxSecPerKm)}–${formatPace(window.minSecPerKm)} /km`;
}

export function blockRunPaceLabel(opts: {
  sport: string;
  zone: string;
  vdot: number | null;
}): string | null {
  if (opts.sport !== "run" || opts.vdot == null || opts.vdot <= 0) {
    return null;
  }
  const zone = Number(opts.zone);
  const thresholdMps = thresholdSpeedMpsFromVdot(opts.vdot);
  const window = paceWindowForZone(zone, thresholdMps);
  if (!window) {
    return null;
  }
  return formatPaceWindow(window);
}
