import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { routes } from "@/lib/routes";
import { listPrograms } from "@/server/actions/programs";

const SPORT_LABEL: Record<string, string> = {
  run: "Corsa",
  swim: "Nuoto",
  ride: "Ciclismo",
};

export default async function ProgramsPage() {
  await requireUser();
  const programs = await listPrograms();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Programmi
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            I tuoi programmi
          </h1>
          <p className="mt-2 text-muted-foreground">
            Crea un piano multi-sport con generazione LLM e modifica manuale dei
            singoli allenamenti.
          </p>
        </div>
        <Button asChild>
          <Link href={routes.programNew}>Nuovo programma</Link>
        </Button>
      </div>

      {programs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">
            Non hai ancora creato un programma.
          </p>
          <Button asChild className="mt-4">
            <Link href={routes.programNew}>Crea il primo programma</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {programs.map((program) => (
            <li key={program.id}>
              <Link
                href={routes.program(program.id)}
                className="block rounded-xl border border-border bg-background p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-medium">{program.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {program.sportsIncluded
                        .map((sport) => SPORT_LABEL[sport] ?? sport)
                        .join(" · ")}{" "}
                      · {program.durationWeeks} settimane
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium uppercase">
                    {program.status}
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
