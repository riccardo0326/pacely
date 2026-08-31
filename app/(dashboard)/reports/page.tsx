import Link from "next/link";
import { GenerateReportButton } from "@/components/generate-report-button";
import { Button } from "@/components/ui/button";
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Report
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Performance
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sintesi periodica su trend metriche e feedback. Non modifica il
            piano: è solo informativa.
          </p>
        </div>
        <GenerateReportButton defaultPeriodDays={defaultPeriodDays} />
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">
            Non hai ancora un report. Viene generato in automatico ogni{" "}
            {defaultPeriodDays} giorni, oppure creane uno ora.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li key={report.id}>
              <Link
                href={routes.report(report.id)}
                className="block rounded-xl border border-border bg-background p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-medium">
                      {formatItalianDate(report.periodStart)} –{" "}
                      {formatItalianDate(report.periodEnd)}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {report.summary}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {report.sourceLabel}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Button asChild variant="outline" className="self-start">
        <Link href={routes.dashboard}>Torna alla dashboard</Link>
      </Button>
    </main>
  );
}
