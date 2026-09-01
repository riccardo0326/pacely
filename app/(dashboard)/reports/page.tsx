import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { GenerateReportButton } from "@/components/generate-report-button";
import { PageHeader } from "@/components/page-header";
import { formatItalianDate } from "@/lib/programs/dates";
import { getReportPeriodDays } from "@/lib/reports/period";
import { requireUser } from "@/lib/auth/require-user";
import { routes } from "@/lib/routes";
import { listPerformanceReports } from "@/server/actions/reports";

export default async function ReportsPage() {
  await requireUser();
  const reports = await listPerformanceReports();
  const defaultPeriodDays = getReportPeriodDays();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <PageHeader
        title="Performance"
        description="Sintesi sul tuo carico e sui feedback del periodo. Scegli un report semplice o tecnico."
        actions={<GenerateReportButton defaultPeriodDays={defaultPeriodDays} />}
      />

      {reports.length === 0 ? (
        <EmptyState
          title="Nessun report ancora"
          description={`Ne arriva uno ogni ${defaultPeriodDays} giorni, oppure generane uno ora.`}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li key={report.id}>
              <Link
                href={routes.report(report.id)}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-medium">
                      {formatItalianDate(report.periodStart)} –{" "}
                      {formatItalianDate(report.periodEnd)}
                    </h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {report.sourceLabel}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {report.summary}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
