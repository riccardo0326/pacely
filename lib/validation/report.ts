import { z } from "zod";
import { performanceReportOutputSchema } from "@/lib/llm/schemas";
import {
  REPORT_PERIOD_DAY_OPTIONS,
  REPORT_STYLE,
  REPORT_STYLE_OPTIONS,
} from "@/lib/reports/constants";

export const generateReportFormSchema = z.object({
  periodDays: z.coerce
    .number()
    .int()
    .refine(
      (value): value is (typeof REPORT_PERIOD_DAY_OPTIONS)[number] =>
        (REPORT_PERIOD_DAY_OPTIONS as readonly number[]).includes(value),
      "Scegli un periodo di 2 o 4 settimane",
    ),
  style: z.enum(REPORT_STYLE_OPTIONS).default(REPORT_STYLE.simple),
});
export type GenerateReportForm = z.infer<typeof generateReportFormSchema>;

export const storedPerformanceReportSchema = performanceReportOutputSchema;
