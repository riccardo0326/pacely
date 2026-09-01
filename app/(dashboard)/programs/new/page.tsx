import { PageHeader } from "@/components/page-header";
import { ProgramCreateForm } from "@/components/program-create-form";
import { requireUser } from "@/lib/auth/require-user";
import { routes } from "@/lib/routes";
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
      <PageHeader
        back={{ href: routes.programs, label: "Annulla" }}
        title="Crea un programma"
        description="Scegli sport, giorni e obiettivo. Il piano userà le tue attività Strava."
      />

      <ProgramCreateForm
        action={createProgramAndRedirect}
        initialError={params.error}
      />
    </main>
  );
}
