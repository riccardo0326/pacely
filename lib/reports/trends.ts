import type { PerformanceAnalysisInput } from "@/lib/llm/schemas";
import { utcDateKey } from "@/lib/metrics/dates";

export type MetricSnapshotPoint = {
  date: Date;
  ctl: number;
  atl: number;
  tsb: number;
  ftp: number | null;
  vdot: number | null;
  swimThresholdPaceSecPer100m: number | null;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function delta(start: number | null, end: number | null): number | undefined {
  if (start === null || end === null) {
    return undefined;
  }
  return round1(end - start);
}

/**
 * First vs last snapshot in the period. Omitted fields mean a threshold was
 * missing on either side — never invent a change.
 */
export function buildMetricTrends(
  snapshots: MetricSnapshotPoint[],
): PerformanceAnalysisInput["metricTrends"] {
  const start = snapshots[0];
  const end = snapshots.at(-1);
  if (!start || !end) {
    return {};
  }

  return {
    ctlChange: delta(start.ctl, end.ctl),
    atlChange: delta(start.atl, end.atl),
    tsbChange: delta(start.tsb, end.tsb),
    ftpChange: delta(start.ftp, end.ftp),
    vdotChange: delta(start.vdot, end.vdot),
    swimThresholdPaceChangeSec: delta(
      start.swimThresholdPaceSecPer100m,
      end.swimThresholdPaceSecPer100m,
    ),
  };
}

export function snapshotDateKey(snapshot: MetricSnapshotPoint): string {
  return utcDateKey(snapshot.date);
}
