"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { deleteProgram } from "@/server/actions/programs";

export function DeleteProgramButton({ programId }: { programId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (
      !window.confirm(
        "Eliminare il programma? Settimane, allenamenti e proposte di ricalcolo verranno cancellati. Non si può annullare.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    const result = await deleteProgram(programId);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(routes.programs);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="destructive"
        onClick={handleDelete}
        disabled={loading}
      >
        {loading ? "Eliminazione..." : "Elimina programma"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
