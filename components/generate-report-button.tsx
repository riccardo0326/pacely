"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  REPORT_PERIOD_DAY_OPTIONS,
  REPORT_STYLE,
  REPORT_STYLE_LABEL,
  REPORT_STYLE_OPTIONS,
  type ReportStyle,
} from "@/lib/reports/constants";
import { routes } from "@/lib/routes";
import { generatePerformanceReportOnDemand } from "@/server/actions/reports";

const PERIOD_LABEL: Record<(typeof REPORT_PERIOD_DAY_OPTIONS)[number], string> =
  {
    14: "Ultime 2 settimane",
    28: "Ultime 4 settimane",
  };

export function GenerateReportButton({
  defaultPeriodDays = 14,
}: {
  defaultPeriodDays?: number;
}) {
  const router = useRouter();
  const [periodDays, setPeriodDays] = useState(
    defaultPeriodDays === 28 ? 28 : 14,
  );
  const [style, setStyle] = useState<ReportStyle>(REPORT_STYLE.simple);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("periodDays", String(periodDays));
    formData.set("style", style);
    const result = await generatePerformanceReportOnDemand(formData);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(routes.report(result.reportId));
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="sr-only" htmlFor="report-period-days">
          Periodo del report
        </label>
        <select
          id="report-period-days"
          value={periodDays}
          disabled={loading}
          onChange={(event) =>
            setPeriodDays(Number(event.target.value) === 28 ? 28 : 14)
          }
          className="h-8 rounded-lg border border-border bg-card px-2 text-sm"
        >
          {REPORT_PERIOD_DAY_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {PERIOD_LABEL[days]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="report-style">
          Tipo di report
        </label>
        <select
          id="report-style"
          value={style}
          disabled={loading}
          onChange={(event) =>
            setStyle(
              event.target.value === REPORT_STYLE.technical
                ? REPORT_STYLE.technical
                : REPORT_STYLE.simple,
            )
          }
          className="h-8 rounded-lg border border-border bg-card px-2 text-sm"
        >
          {REPORT_STYLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {REPORT_STYLE_LABEL[option]}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="accent"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generazione…" : "Genera report"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
