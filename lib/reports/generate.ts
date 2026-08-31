import type { Prisma } from "@prisma/client";
import type { LLMResult } from "@/lib/llm/types";
import type {
  PerformanceAnalysisInput,
  PerformanceReportOutput,
} from "@/lib/llm/schemas";
import { parseUtcDateKey } from "@/lib/metrics/dates";
import type { ReportSource } from "@/lib/reports/constants";
import {
  buildPerformanceAnalysisInput,
  hasReportSourceData,
  type FeedbackForReport,
} from "@/lib/reports/input";
import type { MetricSnapshotPoint } from "@/lib/reports/trends";

export type GenerateReportParams = {
  userId: string;
  periodStart: string;
  periodEnd: string;
  source: ReportSource;
  snapshots: MetricSnapshotPoint[];
  feedbacks: FeedbackForReport[];
};

export type GeneratedReportRecord = {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  source: ReportSource;
  content: PerformanceReportOutput;
  usedFallback: boolean;
};

export type GenerateReportResult =
  | {
      ok: true;
      record: GeneratedReportRecord;
      analysisInput: PerformanceAnalysisInput;
    }
  | { ok: false; reason: "no_data" };

export async function generatePerformanceReportContent(
  params: GenerateReportParams,
  analyze: (
    input: PerformanceAnalysisInput,
  ) => Promise<LLMResult<PerformanceReportOutput>>,
): Promise<GenerateReportResult> {
  if (!hasReportSourceData(params.snapshots, params.feedbacks)) {
    return { ok: false, reason: "no_data" };
  }

  const analysisInput = buildPerformanceAnalysisInput(params);
  const result = await analyze(analysisInput);

  return {
    ok: true,
    analysisInput,
    record: {
      userId: params.userId,
      periodStart: parseUtcDateKey(params.periodStart),
      periodEnd: parseUtcDateKey(params.periodEnd),
      source: params.source,
      content: result.data,
      usedFallback: result.usedFallback,
    },
  };
}

export function reportCreateData(
  record: GeneratedReportRecord,
): Prisma.PerformanceReportCreateInput {
  return {
    user: { connect: { id: record.userId } },
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    source: record.source,
    content: record.content as Prisma.InputJsonValue,
  };
}
