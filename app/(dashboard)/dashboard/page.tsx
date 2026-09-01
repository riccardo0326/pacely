import { DashboardNextSteps } from "@/components/dashboard-next-steps";
import { ImportStatusCard } from "@/components/import-status";
import { MetricsPanel } from "@/components/metrics-panel";
import { PageHeader } from "@/components/page-header";
import { RecalcProposalList } from "@/components/recalc-proposal-card";
import { requireUser } from "@/lib/auth/require-user";
import { listPendingRecalcProposals } from "@/server/actions/feedback";
import { getImportStatus } from "@/server/actions/import";
import { getDashboardMetrics } from "@/server/actions/metrics";
import { listPrograms } from "@/server/actions/programs";

export default async function DashboardPage() {
  const sessionUser = await requireUser();
  const [importStatus, metrics, proposals, programs] = await Promise.all([
    getImportStatus(),
    getDashboardMetrics(),
    listPendingRecalcProposals(),
    listPrograms(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <PageHeader
        title={`Ciao${sessionUser.name ? `, ${sessionUser.name}` : ""}`}
      />
      <DashboardNextSteps
        importStatus={importStatus}
        programCount={programs.length}
      />
      <ImportStatusCard initial={importStatus} />
      <RecalcProposalList proposals={proposals} showProgramLink />
      <MetricsPanel data={metrics} />
    </main>
  );
}
