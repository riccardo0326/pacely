import Link from "next/link";
import { Button } from "@/components/ui/button";
import { USER_FACING_ERROR } from "@/lib/errors/user-facing";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Pacely
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        Pagina non trovata
      </h1>
      <p className="text-sm text-muted-foreground">
        {USER_FACING_ERROR.notFound}
      </p>
      <Button asChild>
        <Link href={routes.home}>Torna all&apos;inizio</Link>
      </Button>
    </main>
  );
}
