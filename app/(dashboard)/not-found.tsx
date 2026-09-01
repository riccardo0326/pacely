import Link from "next/link";
import { Button } from "@/components/ui/button";
import { USER_FACING_ERROR } from "@/lib/errors/user-facing";
import { routes } from "@/lib/routes";

export default function DashboardNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Contenuto non trovato
      </h1>
      <p className="text-sm text-muted-foreground">
        {USER_FACING_ERROR.notFound}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href={routes.dashboard}>Dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.programs}>Programmi</Link>
        </Button>
      </div>
    </main>
  );
}
