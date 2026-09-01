import type { PerformanceAnalysisInput } from "@/lib/llm/schemas";
import { parseFeedbackAnalysis } from "@/lib/feedback/summary";
import {
  MAX_FEEDBACK_SUMMARIES,
  MAX_FEEDBACK_SUMMARY_CHARS,
  REPORT_STYLE,
  type ReportStyle,
} from "@/lib/reports/constants";
import {
  buildMetricTrends,
  type MetricSnapshotPoint,
} from "@/lib/reports/trends";

export type FeedbackForReport = {
  createdAt: Date;
  freeText: string;
  analysis: unknown;
};

export function buildFeedbackSummaries(
  feedbacks: FeedbackForReport[],
): string[] {
  return feedbacks.slice(0, MAX_FEEDBACK_SUMMARIES).map((row) => {
    const analysis = parseFeedbackAnalysis(row.analysis);
    const text = row.freeText.trim().slice(0, MAX_FEEDBACK_SUMMARY_CHARS);
    const bits = [text];
    if (analysis?.deviationSummary) {
      bits.push(analysis.deviationSummary);
    }
    if (analysis?.planDeviation && analysis.planDeviation !== "none") {
      bits.push(`scostamento=${analysis.planDeviation}`);
    }
    if (analysis?.perceivedExertion != null) {
      bits.push(`RPE ${analysis.perceivedExertion}`);
    }
    return bits.join(" · ");
  });
}

export function buildPerformanceAnalysisInput(input: {
  userId: string;
  periodStart: string;
  periodEnd: string;
  snapshots: MetricSnapshotPoint[];
  feedbacks: FeedbackForReport[];
  style?: ReportStyle;
}): PerformanceAnalysisInput {
  return {
    userId: input.userId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    style: input.style ?? REPORT_STYLE.simple,
    metricTrends: buildMetricTrends(input.snapshots),
    feedbackSummaries: buildFeedbackSummaries(input.feedbacks),
  };
}

export function hasReportSourceData(
  snapshots: MetricSnapshotPoint[],
  feedbacks: FeedbackForReport[],
): boolean {
  return snapshots.length > 0 || feedbacks.length > 0;
}
