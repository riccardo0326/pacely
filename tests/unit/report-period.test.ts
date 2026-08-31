import { describe, expect, it } from "vitest";
import { parseUtcDateKey } from "@/lib/metrics/dates";
import {
  getReportPeriodDays,
  isReportDue,
  parseReportPeriodDays,
  resolveReportPeriod,
} from "@/lib/reports/period";

describe("report period", () => {
  it("defaults to 14 days and clamps out-of-range values", () => {
    expect(parseReportPeriodDays(undefined)).toBe(14);
    expect(parseReportPeriodDays("21")).toBe(21);
    expect(parseReportPeriodDays("28")).toBe(28);
    expect(parseReportPeriodDays("7")).toBe(14);
    expect(parseReportPeriodDays("30")).toBe(14);
    expect(parseReportPeriodDays("abc")).toBe(14);
  });

  it("reads REPORT_PERIOD_DAYS from env", () => {
    expect(getReportPeriodDays("21")).toBe(21);
    expect(getReportPeriodDays(undefined)).toBe(14);
  });

  it("builds an inclusive UTC window ending today", () => {
    const window = resolveReportPeriod(parseUtcDateKey("2026-08-31"), 14);
    expect(window.periodEnd).toBe("2026-08-31");
    expect(window.periodStart).toBe("2026-08-18");
    expect(window.periodDays).toBe(14);
  });

  it("is due when no previous report exists or the period has elapsed", () => {
    const now = parseUtcDateKey("2026-08-31");
    expect(isReportDue(null, now, 14)).toBe(true);
    expect(isReportDue(parseUtcDateKey("2026-08-17"), now, 14)).toBe(true);
    expect(isReportDue(parseUtcDateKey("2026-08-18"), now, 14)).toBe(false);
    expect(isReportDue(parseUtcDateKey("2026-08-20"), now, 14)).toBe(false);
  });
});
