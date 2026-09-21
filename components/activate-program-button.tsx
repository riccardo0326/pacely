"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { activateProgram } from "@/server/actions/programs";

type ActivateProgramButtonProps = {
  programId: string;
};

export function ActivateProgramButton({
  programId,
}: ActivateProgramButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setLoading(true);
    setError(null);
    const result = await activateProgram(programId);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="accent"
        onClick={handleActivate}
        disabled={loading}
      >
        {loading ? "Attivazione..." : "Imposta come attivo"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
