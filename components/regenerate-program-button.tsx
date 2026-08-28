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
    const result = await regenerateProgram(programId);
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
        variant="outline"
        onClick={handleRegenerate}
        disabled={loading}
      >
        {loading ? "Rigenerazione..." : "Rigenera programma"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
