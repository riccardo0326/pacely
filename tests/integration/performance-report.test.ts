import { describe, expect, it, vi } from "vitest";
import { validFeedback, validPerformance } from "@/tests/unit/llm-fixtures";
import type { PerformanceAnalysisInput } from "@/lib/llm/schemas";
import type { LLMResult } from "@/lib/llm/types";
import type { PerformanceReportOutput } from "@/lib/llm/schemas";
import {
  generatePerformanceReportContent,
  reportCreateData,
} from "@/lib/reports/generate";
import { REPORT_SOURCE } from "@/lib/reports/constants";
import type { MetricSnapshotPoint } from "@/lib/reports/trends";

const snapshots: MetricSnapshotPoint[] = [
  {
    date: new Date("2026-08-18T00:00:00.000Z"),
    ctl: 40,
    atl: 35,
    tsb: 5,
    ftp: 220,
    vdot: 45,
    swimThresholdPaceSecPer100m: null,
  },
  {
    date: new Date("2026-08-31T00:00:00.000Z"),
    ctl: 48,
    atl: 42,
    tsb: 6,
    ftp: 228,
    vdot: 46,
    swimThresholdPaceSecPer100m: null,
  },
];

const feedbacks = [
  {
    createdAt: new Date("2026-08-22T10:00:00.000Z"),
    freeText: "Poche ore di sonno, uscito ieri sera",
    analysis: validFeedback,
  },
];

function llmResult(
  data: PerformanceReportOutput,
): LLMResult<PerformanceReportOutput> {
  return {
    data,
    source: "llm",
    provider: "deepseek",
    model: "deepseek-chat",
    usedFallback: false,
  };
}

describe("performance report generation (mocked LLM)", () => {
  it("passes metric trends and feedback to the LLM and saves matching content", async () => {
    const analyze = vi.fn(async (input: PerformanceAnalysisInput) => {
      const strengths =
        (input.metricTrends.ctlChange ?? 0) > 0
          ? ["CTL in crescita"]
          : ["Carico stabile"];
      const improvements = input.feedbackSummaries.some((line) =>
        line.toLowerCase().includes("sonno"),
      )
        ? ["Recupero e sonno da migliorare"]
        : ["Nessun feedback sul recupero"];
      return llmResult({
        summary: `CTL ${input.metricTrends.ctlChange} e FTP ${input.metricTrends.ftpChange} nel periodo`,
        strengths,
        improvements,
        suggestions: ["Mantieni un giorno di riposo"],
      });
    });

    const result = await generatePerformanceReportContent(
      {
        userId: "user-1",
        periodStart: "2026-08-18",
        periodEnd: "2026-08-31",
        source: REPORT_SOURCE.onDemand,
        snapshots,
        feedbacks,
      },
      analyze,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(analyze).toHaveBeenCalledOnce();
    expect(result.analysisInput.metricTrends.ctlChange).toBe(8);
    expect(result.analysisInput.metricTrends.ftpChange).toBe(8);
    expect(
      result.analysisInput.feedbackSummaries.some((line) =>
        line.includes("sonno"),
      ),
    ).toBe(true);

    expect(result.record.content.summary).toContain("CTL 8");
    expect(result.record.content.strengths).toContain("CTL in crescita");
    expect(result.record.content.improvements).toContain(
      "Recupero e sonno da migliorare",
    );

    const persist = reportCreateData(result.record);
    expect(persist.source).toBe(REPORT_SOURCE.onDemand);
    expect(persist.content).toEqual(result.record.content);
    expect(persist.user.connect?.id).toBe("user-1");
  });

  it("skips generation when the period has no snapshots or feedback", async () => {
    const analyze = vi.fn(async () => llmResult(validPerformance));
    const result = await generatePerformanceReportContent(
      {
        userId: "user-1",
        periodStart: "2026-08-18",
        periodEnd: "2026-08-31",
        source: REPORT_SOURCE.scheduled,
        snapshots: [],
        feedbacks: [],
      },
      analyze,
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe("no_data");
    expect(analyze).not.toHaveBeenCalled();
  });
});
