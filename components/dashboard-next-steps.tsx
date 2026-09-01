import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { JOB_STATUS } from "@/lib/strava/constants";
import { routes } from "@/lib/routes";
import type { ImportStatus } from "@/server/actions/import";

export function DashboardNextSteps({
  importStatus,
  programCount,
}: {
  importStatus: ImportStatus;
  programCount: number;
}) {
  const job = importStatus.job;
  const importing =
    job?.status === JOB_STATUS.pending || job?.status === JOB_STATUS.running;
  const importFailed = job?.status === JOB_STATUS.failed;

  if (importing) {
    return (
      <EmptyState
        title="Stiamo importando le tue attività"
        description="Tra poco vedrai le metriche e potrai creare un programma."
      />
    );
  }

  if (importFailed) {
    return (
      <EmptyState
        title="Import non riuscito"
        description="Usa «Riprova import» nella scheda Attività Strava qui sotto."
      />
    );
  }

  if (importStatus.activityCount === 0) {
    return (
      <EmptyState
        title="Nessuna attività di corsa, nuoto o ciclismo"
        description="Se hai già allenamenti su Strava, premi «Sincronizza ora». Altrimenti puoi creare comunque un programma."
        action={
          <Button asChild>
            <Link href={routes.programNew}>Crea un programma</Link>
          </Button>
        }
      />
    );
  }

  if (programCount === 0) {
    return (
      <EmptyState
        title="Crea il primo programma"
        description="Scegli un obiettivo e le discipline: il piano apparirà nel calendario."
        action={
          <Button asChild>
            <Link href={routes.programNew}>Crea un programma</Link>
          </Button>
        }
      />
    );
  }

  return null;
}
