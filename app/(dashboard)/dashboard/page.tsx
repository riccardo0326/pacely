import Link from "next/link";
import { DashboardNextSteps } from "@/components/dashboard-next-steps";
import { ImportStatusCard } from "@/components/import-status";
import { MetricsPanel } from "@/components/metrics-panel";
import { RecalcProposalList } from "@/components/recalc-proposal-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { formatItalianDate } from "@/lib/programs/dates";
import { routes } from "@/lib/routes";
import { listPendingRecalcProposals } from "@/server/actions/feedback";
import { getImportStatus } from "@/server/actions/import";
import { getDashboardMetrics } from "@/server/actions/metrics";
import { listPrograms } from "@/server/actions/programs";
import { listPerformanceReports } from "@/server/actions/reports";

export default async function DashboardPage() {
  const sessionUser = await requireUser();
  const [importStatus, metrics, proposals, reports, programs] =
    await Promise.all([
      getImportStatus(),
      getDashboardMetrics(),
      listPendingRecalcProposals(),
      listPerformanceReports(),
      listPrograms(),
    ]);
  const latestReport = reports[0];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Ciao{sessionUser.name ? `, ${sessionUser.name}` : ""}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Account collegato a Strava. Lo storico viene importato in background
          rispettando i limiti API.
        </p>
      </div>
      <DashboardNextSteps
        importStatus={importStatus}
        programCount={programs.length}
      />
      <ImportStatusCard initial={importStatus} />
      <RecalcProposalList proposals={proposals} showProgramLink />
      <MetricsPanel data={metrics} />
      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="font-medium">Report performance</h2>
        {latestReport ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Ultimo: {formatItalianDate(latestReport.periodStart)} –{" "}
            {formatItalianDate(latestReport.periodEnd)}.{" "}
            <span className="line-clamp-2">{latestReport.summary}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Sintesi periodica su metriche e feedback. Non modifica il piano.
          </p>
        )}
        <Button asChild className="mt-4" variant="outline">
          <Link href={routes.reports}>Apri i report</Link>
        </Button>
      </section>
      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="font-medium">Calendario</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confronta gli allenamenti pianificati con le attività Strava.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={routes.calendar}>Apri il calendario</Link>
        </Button>
      </section>
      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="font-medium">Programmi di allenamento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {programs.length === 0
            ? "Crea e gestisci piani multi-sport generati con LLM."
            : programs.length === 1
              ? "1 programma salvato."
              : `${programs.length} programmi salvati.`}
        </p>
        <Button asChild className="mt-4">
          <Link href={routes.programs}>Vai ai programmi</Link>
        </Button>
      </section>
    </main>
  );
}
