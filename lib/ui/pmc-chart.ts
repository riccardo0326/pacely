export type PmcSeriesKey = "ctl" | "atl" | "tsb";

export type PmcChartPoint = {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
};

export const PMC_CHART_WIDTH = 640;
export const PMC_CHART_HEIGHT = 220;
export const PMC_PAD = { top: 12, right: 12, bottom: 28, left: 36 };

export function pmcYDomain(points: PmcChartPoint[]): {
  minY: number;
  maxY: number;
} {
  const values = points.flatMap((point) => [point.ctl, point.atl, point.tsb]);
  const minY = Math.min(0, ...values);
  const maxY = Math.max(...values, 1);
  return { minY, maxY };
}

export function pmcYTicks(minY: number, maxY: number): number[] {
  const ticks = new Set<number>([Math.round(minY), 0, Math.round(maxY)]);
  return [...ticks]
    .filter((value) => value >= minY - 0.51 && value <= maxY + 0.51)
    .sort((a, b) => a - b);
}

export function pmcXTickIndexes(pointCount: number): number[] {
  if (pointCount <= 0) {
    return [];
  }
  if (pointCount === 1) {
    return [0];
  }
  if (pointCount === 2) {
    return [0, 1];
  }
  return [0, Math.floor((pointCount - 1) / 2), pointCount - 1];
}

export function pointX(
  index: number,
  pointCount: number,
  width = PMC_CHART_WIDTH,
  pad = PMC_PAD,
): number {
  const innerW = width - pad.left - pad.right;
  if (pointCount <= 1) {
    return pad.left + innerW / 2;
  }
  return pad.left + (index / (pointCount - 1)) * innerW;
}

export function pointY(
  value: number,
  minY: number,
  maxY: number,
  height = PMC_CHART_HEIGHT,
  pad = PMC_PAD,
): number {
  const innerH = height - pad.top - pad.bottom;
  const range = maxY - minY || 1;
  return pad.top + innerH - ((value - minY) / range) * innerH;
}

export function clientXToIndex(
  clientX: number,
  rect: { left: number; width: number },
  pointCount: number,
  viewWidth = PMC_CHART_WIDTH,
  pad = PMC_PAD,
): number {
  if (pointCount <= 1) {
    return 0;
  }
  const xInView = ((clientX - rect.left) / rect.width) * viewWidth;
  const innerW = viewWidth - pad.left - pad.right;
  const t = (xInView - pad.left) / innerW;
  return Math.round(Math.max(0, Math.min(1, t)) * (pointCount - 1));
}

export function formatPmcDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00.000Z`).toLocaleDateString("it-IT", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

export const PMC_WINDOW_DAYS = [7, 30, 90] as const;
export type PmcWindowDays = (typeof PMC_WINDOW_DAYS)[number];

export function clampPmcOffset(
  pointCount: number,
  windowDays: number,
  offsetFromEnd: number,
): number {
  const maxOffset = Math.max(0, pointCount - windowDays);
  return Math.max(0, Math.min(Math.round(offsetFromEnd), maxOffset));
}

export function slicePmcWindow<T>(
  points: T[],
  windowDays: number,
  offsetFromEnd = 0,
): T[] {
  if (points.length === 0) {
    return points;
  }
  const offset = clampPmcOffset(points.length, windowDays, offsetFromEnd);
  const end = points.length - offset;
  const start = Math.max(0, end - windowDays);
  return points.slice(start, end);
}

export function formatPmcRangeLabel(points: Array<{ date: string }>): string {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) {
    return "";
  }
  return `${formatPmcDate(first.date)} – ${formatPmcDate(last.date)}`;
}
