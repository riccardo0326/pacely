import { notFound } from "next/navigation";
import { DeleteProgramButton } from "@/components/delete-program-button";
import { ExportProgramExcelButton } from "@/components/export-program-excel-button";
import { PageHeader } from "@/components/page-header";
import { ProgramTimeline } from "@/components/program-timeline";
import { RecalcProposalCard } from "@/components/recalc-proposal-card";
import { RegenerateProgramButton } from "@/components/regenerate-program-button";
import { SportBadge } from "@/components/sport-badge";
import { ProgramStatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth/require-user";
import { routes } from "@/lib/routes";
import { getPendingRecalcProposalForProgram } from "@/server/actions/feedback";
import { getProgram } from "@/server/actions/programs";

type ProgramDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ generated?: string }>;
};

export default async function ProgramDetailPage({
  params,
  searchParams,
}: ProgramDetailPageProps) {
  await requireUser();
  const { id } = await params;
  const { generated } = await searchParams;
  const [program, proposal] = await Promise.all([
    getProgram(id),
    getPendingRecalcProposalForProgram(id),
  ]);
  if (!program) {
    notFound();
  }

  const description = program.goal?.description ?? program.summary ?? undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      {generated === "fallback" ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          Non siamo riusciti a generare il piano. Ecco una bozza: puoi
          modificarla o rigenerarla.
        </p>
      ) : null}
      <PageHeader
        back={{ href: routes.programs, label: "Programmi" }}
        title={program.name}
        description={description}
        actions={
          <>
            <ExportProgramExcelButton program={program} />
            <RegenerateProgramButton programId={program.id} />
            <DeleteProgramButton programId={program.id} />
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <ProgramStatusBadge status={program.status} />
        {program.sportsIncluded.map((sport) => (
          <SportBadge key={sport} sport={sport} />
        ))}
        <span className="text-sm text-muted-foreground">
          {program.durationWeeks} settimane
        </span>
      </div>

      {proposal ? <RecalcProposalCard proposal={proposal} /> : null}

      <ProgramTimeline program={program} />
    </main>
  );
}
