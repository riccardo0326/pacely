"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import type { PerformanceReportOutput } from "@/lib/llm/schemas";
import {
  assertAnalyzePerformanceQuota,
  LlmQuotaExceededError,
} from "@/lib/llm/quota";
import { prisma } from "@/lib/prisma";
import {
  REPORT_SOURCE,
  REPORT_SOURCE_LABEL,
  buildMetricTrends,
  isReportSource,
  type ReportMetricStrip,
} from "@/lib/reports";
import { routes } from "@/lib/routes";
import {
  generateReportFormSchema,
  storedPerformanceReportSchema,
} from "@/lib/validation/report";
import { generateAndSaveReportForUser } from "@/server/jobs/performance-reports";

export type ReportListItem = {
  id: string;
  periodStart: string;
  periodEnd: string;
  source: string;
  sourceLabel: string;
  summary: string;
  createdAt: string;
};

export type ReportDetail = ReportListItem & {
  content: PerformanceReportOutput | null;
  metrics: ReportMetricStrip | null;
};

export type GenerateReportActionResult =
  | { ok: true; reportId: string; usedFallback: boolean }
  | { ok: false; error: string };

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toListItem(row: {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  source: string;
  content: unknown;
  createdAt: Date;
}): ReportListItem {
  const content = storedPerformanceReportSchema.safeParse(row.content);
  const sourceLabel = isReportSource(row.source)
    ? REPORT_SOURCE_LABEL[row.source]
    : row.source;
  return {
    id: row.id,
    periodStart: isoDate(row.periodStart),
    periodEnd: isoDate(row.periodEnd),
    source: row.source,
    sourceLabel,
    summary: content.success ? content.data.summary : "Report non leggibile",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listPerformanceReports(): Promise<ReportListItem[]> {
  const user = await requireUser();
  const rows = await prisma.performanceReport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toListItem);
}

export async function getPerformanceReport(
  id: string,
): Promise<ReportDetail | null> {
  const user = await requireUser();
  const row = await prisma.performanceReport.findFirst({
    where: { id, userId: user.id },
  });
  if (!row) {
    return null;
  }
  const content = storedPerformanceReportSchema.safeParse(row.content);
  const snapshots = await prisma.performanceMetricSnapshot.findMany({
    where: {
      userId: user.id,
      date: { gte: row.periodStart, lte: row.periodEnd },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      ctl: true,
      atl: true,
      tsb: true,
      ftp: true,
      vdot: true,
      swimThresholdPaceSecPer100m: true,
    },
  });
  const latest = snapshots.at(-1);
  const trends = buildMetricTrends(snapshots);

  return {
    ...toListItem(row),
    content: content.success ? content.data : null,
    metrics: latest
      ? {
          ctl: latest.ctl,
          atl: latest.atl,
          tsb: latest.tsb,
          ctlChange: trends.ctlChange,
          atlChange: trends.atlChange,
          tsbChange: trends.tsbChange,
        }
      : null,
  };
}

export async function generatePerformanceReportOnDemand(
  formData: FormData,
): Promise<GenerateReportActionResult> {
  const user = await requireUser();
  const parsed = generateReportFormSchema.safeParse({
    periodDays: formData.get("periodDays"),
    style: formData.get("style") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Scegli un periodo di 2 o 4 settimane" };
  }

  try {
    await assertAnalyzePerformanceQuota(user.id);
  } catch (error) {
    if (error instanceof LlmQuotaExceededError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const result = await generateAndSaveReportForUser(user.id, {
    source: REPORT_SOURCE.onDemand,
    periodDays: parsed.data.periodDays,
    style: parsed.data.style,
  });

  if (!result.ok) {
    return {
      ok: false,
      error:
        "Non ci sono abbastanza dati nel periodo (metriche o feedback). Riprova dopo qualche allenamento.",
    };
  }

  revalidatePath(routes.reports);
  revalidatePath(routes.report(result.reportId));
  revalidatePath(routes.dashboard);
  return {
    ok: true,
    reportId: result.reportId,
    usedFallback: result.usedFallback,
  };
}
