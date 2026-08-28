import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { logout } from "@/server/actions/auth";

export default async function DashboardPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findFirst({
    where: { id: sessionUser.id },
    select: { name: true, role: true, stravaAthleteId: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Ciao{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Account collegato a Strava
            {user?.stravaAthleteId ? ` (#${user.stravaAthleteId})` : ""}. Import
            attività e programmi arriveranno nelle prossime fasi.
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline">
            Esci
          </Button>
        </form>
      </div>
    </main>
  );
}
