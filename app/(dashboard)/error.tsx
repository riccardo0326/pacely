"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { USER_FACING_ERROR } from "@/lib/errors/user-facing";
import { routes } from "@/lib/routes";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Non siamo riusciti a caricare questa schermata
      </h1>
      <p className="text-sm text-muted-foreground">
        {USER_FACING_ERROR.pageLoad}
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">Codice: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          Riprova
        </Button>
        <Button asChild variant="outline">
          <a href={routes.dashboard}>Dashboard</a>
        </Button>
      </div>
    </main>
  );
}
