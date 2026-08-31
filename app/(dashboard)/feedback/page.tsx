import Link from "next/link";
import { BetaFeedbackForm } from "@/components/beta-feedback-form";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { routes } from "@/lib/routes";

export default async function FeedbackPage() {
  await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Beta
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Feedback per le prossime iterazioni
        </h1>
        <p className="mt-2 text-muted-foreground">
          Pacely è in test con un piccolo gruppo. Segnala bug, frizioni UX o
          idee: i messaggi restano legati al tuo account e non sono pubblici.
        </p>
      </div>

      <BetaFeedbackForm />

      <Button asChild variant="outline" className="self-start">
        <Link href={routes.dashboard}>Torna alla dashboard</Link>
      </Button>
    </main>
  );
}
