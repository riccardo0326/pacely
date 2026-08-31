import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { routes } from "@/lib/routes";
import { connectWithStrava } from "@/server/actions/auth";

const STEPS = [
  {
    title: "Collega Strava",
    body: "Login solo con Strava. Pacely importa le attività, senza scrivere nulla sul tuo account.",
  },
  {
    title: "Vedi carico e forma",
    body: "TSS, CTL/ATL/TSB, FTP, VDOT e soglia nuoto calcolati dallo storico.",
  },
  {
    title: "Crea un programma",
    body: "Obiettivo gara o generico, 1–3 sport. Generazione LLM e modifica a blocchi.",
  },
  {
    title: "Segui e adatta",
    body: "Calendario pianificato vs effettivo, feedback dopo l'allenamento, report periodici.",
  },
] as const;

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div>
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Pacely · beta
        </p>
        <h1 className="mt-2 max-w-xl text-4xl font-semibold tracking-tight">
          Programmi di allenamento multi-sport collegati a Strava
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Collega Strava per importare lo storico, vedere le metriche e
          costruire un piano su misura.
        </p>
      </div>
      {session?.user ? (
        <Button asChild size="lg">
          <Link href={routes.dashboard}>Vai alla dashboard</Link>
        </Button>
      ) : (
        <form
          action={async () => {
            "use server";
            await connectWithStrava();
          }}
        >
          <Button type="submit" size="lg">
            Connetti con Strava
          </Button>
        </form>
      )}
      <ol className="grid w-full gap-3 text-left sm:grid-cols-2">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-xl border border-border bg-background p-4"
          >
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {index + 1}
            </p>
            <h2 className="mt-1 font-medium">{step.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
