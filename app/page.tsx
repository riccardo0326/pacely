import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { connectWithStrava } from "@/server/actions/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Pacely
      </p>
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight">
        Programmi di allenamento multi-sport collegati a Strava
      </h1>
      <p className="max-w-md text-muted-foreground">
        Collega Strava per importare lo storico e costruire programmi su misura.
      </p>
      {session?.user ? (
        <Button asChild size="lg">
          <a href="/dashboard">Vai alla dashboard</a>
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
    </main>
  );
}
