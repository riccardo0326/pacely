"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RECALC_ACTION_LABEL } from "@/lib/feedback/labels";
import { routes } from "@/lib/routes";
import {
  approveRecalcProposal,
  rejectRecalcProposal,
  type RecalcProposalView,
} from "@/server/actions/feedback";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("it-IT", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

function WorkoutDiff({
  workout,
}: {
  workout: RecalcProposalView["workouts"][number];
}) {
  const bits: string[] = [];
  if (
    workout.durationMinFrom != null &&
    workout.durationMinTo != null &&
    workout.durationMinFrom !== workout.durationMinTo
  ) {
    bits.push(`${workout.durationMinFrom} → ${workout.durationMinTo} min`);
  }
  if (
    workout.tssFrom != null &&
    workout.tssTo != null &&
    workout.tssFrom !== workout.tssTo
  ) {
    bits.push(
      `TSS ${Math.round(workout.tssFrom)} → ${Math.round(workout.tssTo)}`,
    );
  }
  if (
    workout.plannedDateFrom &&
    workout.plannedDateTo &&
    workout.plannedDateFrom !== workout.plannedDateTo
  ) {
    bits.push(
      `${formatDate(workout.plannedDateFrom)} → ${formatDate(workout.plannedDateTo)}`,
    );
  }
  const nameChanged = workout.nameFrom !== workout.nameTo;

  return (
    <li className="text-sm">
      <span className="font-medium">
        {nameChanged
          ? `${workout.nameFrom} → ${workout.nameTo}`
          : workout.nameFrom}
      </span>
      {bits.length > 0 ? (
        <span className="text-muted-foreground"> · {bits.join(" · ")}</span>
      ) : null}
    </li>
  );
}

export function RecalcProposalCard({
  proposal,
  showProgramLink = false,
}: {
  proposal: RecalcProposalView;
  showProgramLink?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(
    action: (
      formData: FormData,
    ) => Promise<{ ok: true } | { ok: false; error: string }>,
  ) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("proposalId", proposal.id);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <p className="text-xs font-medium tracking-wide text-amber-800 uppercase dark:text-amber-300">
        Proposta di ricalcolo
      </p>
      <h2 className="mt-1 font-medium">
        {RECALC_ACTION_LABEL[proposal.action]}
        {showProgramLink ? (
          <>
            {" · "}
            <Link
              href={routes.program(proposal.programId)}
              className="underline-offset-2 hover:underline"
            >
              {proposal.programName}
            </Link>
          </>
        ) : null}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{proposal.rationale}</p>
      <p className="mt-1 text-sm">{proposal.summary}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Le modifiche non vengono applicate finché non le approvi.
      </p>
      <ul className="mt-3 flex flex-col gap-1">
        {proposal.workouts.map((workout) => (
          <WorkoutDiff key={workout.workoutId} workout={workout} />
        ))}
      </ul>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run(approveRecalcProposal)}
        >
          Approva
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(rejectRecalcProposal)}
        >
          Rifiuta
        </Button>
      </div>
    </section>
  );
}

export function RecalcProposalList({
  proposals,
  showProgramLink = false,
}: {
  proposals: RecalcProposalView[];
  showProgramLink?: boolean;
}) {
  if (proposals.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3">
      {proposals.map((proposal) => (
        <RecalcProposalCard
          key={proposal.id}
          proposal={proposal}
          showProgramLink={showProgramLink}
        />
      ))}
    </div>
  );
}
