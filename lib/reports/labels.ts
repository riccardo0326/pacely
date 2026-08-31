import { REPORT_SOURCE, type ReportSource } from "@/lib/reports/constants";

export const REPORT_SOURCE_LABEL: Record<ReportSource, string> = {
  [REPORT_SOURCE.scheduled]: "Automatico",
  [REPORT_SOURCE.onDemand]: "Su richiesta",
};

export function isReportSource(value: string): value is ReportSource {
  return value === REPORT_SOURCE.scheduled || value === REPORT_SOURCE.onDemand;
}
