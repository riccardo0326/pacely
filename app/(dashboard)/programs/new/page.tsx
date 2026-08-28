import Link from "next/link";
import { ProgramCreateForm } from "@/components/program-create-form";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { createProgramAndRedirect } from "@/server/actions/programs";

type NewProgramPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewProgramPage({
  searchParams,
}: NewProgramPageProps) {
  await requireUser();
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Nuovo programma
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Crea un programma
        </h1>
        <p className="mt-2 text-muted-foreground">
          Compila il form: il generatore userà le tue attività Strava e un
          budget TSS settimanale ragionevole.
        </p>
      </div>

      <ProgramCreateForm
        action={createProgramAndRedirect}
        initialError={params.error}
      />

      <Button asChild variant="outline" className="self-start">
        <Link href="/dashboard/programs">Annulla</Link>
      </Button>
    </main>
  );
}
