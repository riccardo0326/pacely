import { getLLMProvider } from "@/lib/llm";
import { addUtcDays, utcDateKey } from "@/lib/metrics/dates";
import { prisma } from "@/lib/prisma";
import {
  REPORT_CRON_MAX_USERS,
  REPORT_SOURCE,
  generatePerformanceReportContent,
  isReportDue,
  reportCreateData,
  resolveReportPeriod,
  type FeedbackForReport,
  type MetricSnapshotPoint,
  type ReportSource,
} from "@/lib/reports";
import { getReportPeriodDays } from "@/lib/reports/period";

export type GenerateReportOptions = {
  source: ReportSource;
  periodDays?: number;
  now?: Date;
};

export type SavedReportResult =
  | { ok: true; reportId: string; usedFallback: boolean }
  | { ok: false; reason: "no_data" };

async function loadReportSourceData(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{
  snapshots: MetricSnapshotPoint[];
  feedbacks: FeedbackForReport[];
}> {
  const periodEndExclusive = new Date(
    `${addUtcDays(utcDateKey(periodEnd), 1)}T00:00:00.000Z`,
  );

  const [snapshots, feedbacks] = await Promise.all([
    prisma.performanceMetricSnapshot.findMany({
      where: { userId, date: { gte: periodStart, lte: periodEnd } },
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
    }),
    prisma.workoutFeedback.findMany({
      where: {
        createdAt: { gte: periodStart, lt: periodEndExclusive },
        workout: { week: { program: { userId } } },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, freeText: true, analysis: true },
    }),
  ]);

  return { snapshots, feedbacks };
}

export async function generateAndSaveReportForUser(
  userId: string,
  options: GenerateReportOptions,
): Promise<SavedReportResult> {
  const now = options.now ?? new Date();
  const window = resolveReportPeriod(now, options.periodDays);
  const periodStart = new Date(`${window.periodStart}T00:00:00.000Z`);
  const periodEnd = new Date(`${window.periodEnd}T00:00:00.000Z`);
  const { snapshots, feedbacks } = await loadReportSourceData(
    userId,
    periodStart,
    periodEnd,
  );

  const provider = getLLMProvider();
  const generated = await generatePerformanceReportContent(
    {
      userId,
      periodStart: window.periodStart,
      periodEnd: window.periodEnd,
      source: options.source,
      snapshots,
      feedbacks,
    },
    (input) => provider.analyzePerformance(input),
  );

  if (!generated.ok) {
    return { ok: false, reason: generated.reason };
  }

  const saved = await prisma.performanceReport.create({
    data: reportCreateData(generated.record),
    select: { id: true },
  });

  return {
    ok: true,
    reportId: saved.id,
    usedFallback: generated.record.usedFallback,
  };
}

export async function findUsersDueForReport(
  now = new Date(),
  periodDays = getReportPeriodDays(),
): Promise<string[]> {
  const candidates = await prisma.user.findMany({
    where: {
      OR: [
        { performanceMetricSnapshots: { some: {} } },
        {
          programs: {
            some: {
              weeks: {
                some: {
                  workouts: { some: { feedback: { isNot: null } } },
                },
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      performanceReports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  return candidates
    .filter((user) =>
      isReportDue(
        user.performanceReports[0]?.createdAt ?? null,
        now,
        periodDays,
      ),
    )
    .map((user) => user.id);
}

export type PerformanceReportCronResult = {
  generated: number;
  skipped: number;
  failed: number;
};

export async function runPerformanceReportCron(
  now = new Date(),
): Promise<PerformanceReportCronResult> {
  const periodDays = getReportPeriodDays();
  const dueUserIds = await findUsersDueForReport(now, periodDays);
  const batch = dueUserIds.slice(0, REPORT_CRON_MAX_USERS);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const userId of batch) {
    try {
      const result = await generateAndSaveReportForUser(userId, {
        source: REPORT_SOURCE.scheduled,
        periodDays,
        now,
      });
      if (result.ok) {
        generated += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`performance report failed for user ${userId}`, error);
    }
  }

  return { generated, skipped, failed };
}
