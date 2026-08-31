import Link from "next/link";
import { notFound } from "next/navigation";
import { ExportProgramExcelButton } from "@/components/export-program-excel-button";
import { ProgramTimeline } from "@/components/program-timeline";
import { RecalcProposalCard } from "@/components/recalc-proposal-card";
import { RegenerateProgramButton } from "@/components/regenerate-program-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { routes } from "@/lib/routes";
import { getPendingRecalcProposalForProgram } from "@/server/actions/feedback";
import { getProgram } from "@/server/actions/programs";

type ProgramDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProgramDetailPage({
  params,
}: ProgramDetailPageProps) {
  await requireUser();
  const { id } = await params;
  const [program, proposal] = await Promise.all([
    getProgram(id),
    getPendingRecalcProposalForProgram(id),
  ]);
  if (!program) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Programma
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {program.name}
          </h1>
          {program.summary ? (
            <p className="mt-2 text-muted-foreground">{program.summary}</p>
          ) : null}
          {program.goal ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Obiettivo: {program.goal.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <ExportProgramExcelButton program={program} />
          <RegenerateProgramButton programId={program.id} />
        </div>
      </div>

      {proposal ? <RecalcProposalCard proposal={proposal} /> : null}

      <ProgramTimeline program={program} />

      <Button asChild variant="outline" className="self-start">
        <Link href={routes.programs}>Torna ai programmi</Link>
      </Button>
    </main>
  );
}
