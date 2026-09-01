import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SportBadge } from "@/components/sport-badge";
import { ProgramStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { routes } from "@/lib/routes";
import { listPrograms } from "@/server/actions/programs";

export default async function ProgramsPage() {
  await requireUser();
  const programs = await listPrograms();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <PageHeader
        title="I tuoi programmi"
        description="Piani multi-sport verso un obiettivo. Puoi modificarli a mano."
        actions={
          <Button asChild>
            <Link href={routes.programNew}>Nuovo programma</Link>
          </Button>
        }
      />

      {programs.length === 0 ? (
        <EmptyState
          title="Nessun programma"
          description="Scegli le discipline e un obiettivo: gara o generico."
          action={
            <Button asChild>
              <Link href={routes.programNew}>Crea il primo programma</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {programs.map((program) => (
            <li key={program.id}>
              <Link
                href={routes.program(program.id)}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-medium">{program.name}</h2>
                    <ProgramStatusBadge status={program.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {program.sportsIncluded.map((sport) => (
                      <SportBadge key={sport} sport={sport} />
                    ))}
                    <span className="text-sm text-muted-foreground">
                      · {program.durationWeeks} settimane
                    </span>
                  </div>
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
