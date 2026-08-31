import { describe, expect, it } from "vitest";
import { validFeedback } from "@/tests/unit/llm-fixtures";
import { buildFeedbackSummaries } from "@/lib/reports/input";
import {
  buildMetricTrends,
  type MetricSnapshotPoint,
} from "@/lib/reports/trends";

function snapshot(
  date: string,
  overrides: Partial<MetricSnapshotPoint> = {},
): MetricSnapshotPoint {
  return {
    date: new Date(`${date}T00:00:00.000Z`),
    ctl: 40,
    atl: 35,
    tsb: 5,
    ftp: 220,
    vdot: 45,
    swimThresholdPaceSecPer100m: 95,
    ...overrides,
  };
}

describe("buildMetricTrends", () => {
  it("computes first-to-last deltas and omits missing thresholds", () => {
    const trends = buildMetricTrends([
      snapshot("2026-08-18", { ctl: 40, ftp: 220, vdot: null }),
      snapshot("2026-08-31", {
        ctl: 48,
        atl: 42,
        tsb: 6,
        ftp: 228,
        vdot: 46,
        swimThresholdPaceSecPer100m: 90,
      }),
    ]);

    expect(trends.ctlChange).toBe(8);
    expect(trends.atlChange).toBe(7);
    expect(trends.tsbChange).toBe(1);
    expect(trends.ftpChange).toBe(8);
    expect(trends.vdotChange).toBeUndefined();
    expect(trends.swimThresholdPaceChangeSec).toBe(-5);
  });

  it("returns an empty object when there are no snapshots", () => {
    expect(buildMetricTrends([])).toEqual({});
  });
});

describe("buildFeedbackSummaries", () => {
  it("joins free text with structured analysis", () => {
    const summaries = buildFeedbackSummaries([
      {
        createdAt: new Date("2026-08-22T10:00:00.000Z"),
        freeText: "Poche ore di sonno, FC alta",
        analysis: validFeedback,
      },
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toContain("Poche ore di sonno");
    expect(summaries[0]).toContain(validFeedback.deviationSummary);
    expect(summaries[0]).toContain("RPE 7");
  });
});
