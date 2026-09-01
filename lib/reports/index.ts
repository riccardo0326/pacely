export {
  MAX_FEEDBACK_SUMMARIES,
  REPORT_CRON_MAX_USERS,
  REPORT_PERIOD_DAY_OPTIONS,
  REPORT_PERIOD_DAYS_DEFAULT,
  REPORT_SOURCE,
  REPORT_STYLE,
  REPORT_STYLE_LABEL,
  REPORT_STYLE_OPTIONS,
  isReportStyle,
  type ReportPeriodDayOption,
  type ReportSource,
  type ReportStyle,
} from "@/lib/reports/constants";
export {
  generatePerformanceReportContent,
  reportCreateData,
} from "@/lib/reports/generate";
export type {
  GenerateReportParams,
  GenerateReportResult,
  GeneratedReportRecord,
} from "@/lib/reports/generate";
export {
  buildFeedbackSummaries,
  buildPerformanceAnalysisInput,
  hasReportSourceData,
} from "@/lib/reports/input";
export type { FeedbackForReport } from "@/lib/reports/input";
export { REPORT_SOURCE_LABEL, isReportSource } from "@/lib/reports/labels";
export {
  getReportPeriodDays,
  isReportDue,
  parseReportPeriodDays,
  resolveReportPeriod,
} from "@/lib/reports/period";
export type { ReportPeriodWindow } from "@/lib/reports/period";
export { buildMetricTrends } from "@/lib/reports/trends";
export type {
  MetricSnapshotPoint,
  ReportMetricStrip,
} from "@/lib/reports/trends";
