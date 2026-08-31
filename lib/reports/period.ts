import {
  REPORT_PERIOD_DAYS_DEFAULT,
  REPORT_PERIOD_DAYS_MAX,
  REPORT_PERIOD_DAYS_MIN,
} from "@/lib/reports/constants";
import { addUtcDays, utcToday } from "@/lib/metrics/dates";

export function parseReportPeriodDays(raw: string | undefined): number {
  const value = Number(raw);
  if (
    !Number.isInteger(value) ||
    value < REPORT_PERIOD_DAYS_MIN ||
    value > REPORT_PERIOD_DAYS_MAX
  ) {
    return REPORT_PERIOD_DAYS_DEFAULT;
  }
  return value;
}

export function getReportPeriodDays(
  raw: string | undefined = process.env.REPORT_PERIOD_DAYS,
): number {
  return parseReportPeriodDays(raw);
}

export type ReportPeriodWindow = {
  periodStart: string;
  periodEnd: string;
  periodDays: number;
};

/** Inclusive UTC window of `periodDays` ending today. */
export function resolveReportPeriod(
  now = new Date(),
  periodDays = getReportPeriodDays(),
): ReportPeriodWindow {
  const periodEnd = utcToday(now);
  const periodStart = addUtcDays(periodEnd, -(periodDays - 1));
  return { periodStart, periodEnd, periodDays };
}

export function isReportDue(
  lastCreatedAt: Date | null,
  now: Date,
  periodDays: number,
): boolean {
  if (lastCreatedAt === null) {
    return true;
  }
  const elapsedMs = now.getTime() - lastCreatedAt.getTime();
  return elapsedMs >= periodDays * 86_400_000;
}
