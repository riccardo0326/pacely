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
        title="Primo passo: import dello storico"
        description="Stiamo scaricando le attività da Strava. Quando finisce vedrai le metriche e potrai creare un programma."
      />
    );
  }

  if (importFailed) {
    return (
      <EmptyState
        title="Import non riuscito"
        description="Lo storico non è stato importato. Usa «Riprova import» nella scheda Attività Strava qui sotto."
      />
    );
  }

  if (importStatus.activityCount === 0) {
    return (
      <EmptyState
        title="Nessuna attività di corsa, nuoto o ciclismo"
        description="Pacely importa solo run, swim e ride. Se hai già allenamenti su Strava, premi «Sincronizza ora». Altrimenti crea comunque un programma: useremo un budget di carico conservativo."
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
        description="Lo storico è pronto. Genera un piano multi-sport verso un obiettivo (gara o generico), poi seguilo dal calendario."
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
