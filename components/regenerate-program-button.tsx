"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { regenerateProgram } from "@/server/actions/programs";

type RegenerateProgramButtonProps = {
  programId: string;
};

export function RegenerateProgramButton({
  programId,
}: RegenerateProgramButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleRegenerate() {
    if (
      !window.confirm(
        "Rigenerare il programma sostituirà tutte le settimane e gli allenamenti. Continuare?",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    const result = await regenerateProgram(programId);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.usedFallback) {
      setNotice(
        "Non siamo riusciti a rigenerare il piano. Ecco una bozza: puoi modificarla a mano.",
      );
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="default"
        onClick={handleRegenerate}
        disabled={loading}
      >
        {loading ? "Rigenerazione..." : "Rigenera programma"}
      </Button>
      {notice ? (
        <p className="text-sm text-muted-foreground">{notice}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
