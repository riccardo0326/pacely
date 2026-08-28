import { Button } from "@/components/ui/button";
import { connectWithStrava } from "@/server/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Pacely
      </p>
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight">
        Connetti il tuo account Strava
      </h1>
      <p className="max-w-md text-muted-foreground">
        Il login avviene solo tramite Strava. Pacely importa le attività, senza
        scrivere nulla sul tuo account.
      </p>
      {params.error ? (
        <p className="max-w-md text-sm text-destructive">
          Accesso non riuscito. Riprova oppure verifica che l&apos;app Strava
          abbia l&apos;Authorization Callback Domain corretto.
        </p>
      ) : null}
      <form
        action={async () => {
          "use server";
          await connectWithStrava(callbackUrl);
        }}
      >
        <Button type="submit" size="lg">
          Connetti con Strava
        </Button>
      </form>
    </main>
  );
}
