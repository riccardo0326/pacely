export const REPORT_PERIOD_DAYS_MIN = 14;
export const REPORT_PERIOD_DAYS_MAX = 28;
export const REPORT_PERIOD_DAYS_DEFAULT = 14;

/** Allowed on-demand window lengths (2 or 4 weeks). */
export const REPORT_PERIOD_DAY_OPTIONS = [14, 28] as const;
export type ReportPeriodDayOption = (typeof REPORT_PERIOD_DAY_OPTIONS)[number];

export const REPORT_SOURCE = {
  scheduled: "scheduled",
  onDemand: "on_demand",
} as const;

export type ReportSource = (typeof REPORT_SOURCE)[keyof typeof REPORT_SOURCE];

export const MAX_FEEDBACK_SUMMARIES = 30;
export const MAX_FEEDBACK_SUMMARY_CHARS = 200;

/** Cap scheduled generations per cron run (each call is an LLM round-trip). */
export const REPORT_CRON_MAX_USERS = 5;
