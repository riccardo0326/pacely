import {
  durationDeltaPct,
  type PlannedActualTotals,
} from "@/lib/calendar/compare";

function formatDelta(pct: number | null): string {
  if (pct === null) {
    return "—";
  }
  const rounded = Math.round(pct);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

export function PlannedVsActualSummary({
  totals,
}: {
  totals: PlannedActualTotals;
}) {
  if (totals.plannedCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun allenamento pianificato in questo periodo.
      </p>
    );
  }

  const durationPct = durationDeltaPct(
    totals.plannedDurationMin,
    totals.actualDurationMin,
  );
  const tssPct = durationDeltaPct(totals.plannedTss, totals.actualTss);

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-border bg-card px-3 py-3">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          Completati
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {totals.completedCount}/{totals.plannedCount}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {totals.skippedCount} saltati · {totals.unmatchedCount} da abbinare
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card px-3 py-3">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          Durata
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {totals.actualDurationMin} / {totals.plannedDurationMin} min
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Scostamento {formatDelta(durationPct)}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card px-3 py-3">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          TSS
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {Math.round(totals.actualTss)} / {Math.round(totals.plannedTss)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Scostamento {formatDelta(tssPct)}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card px-3 py-3">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          Completamento
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {totals.plannedCount === 0
            ? "—"
            : `${Math.round((totals.completedCount / totals.plannedCount) * 100)}%`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pianificato vs effettivo
        </p>
      </div>
    </div>
  );
}

export function WorkoutComparison({
  plannedMin,
  actualMin,
  plannedTss,
  actualTss,
}: {
  plannedMin: number;
  actualMin: number | null;
  plannedTss: number;
  actualTss: number | null;
}) {
  if (actualMin === null) {
    return (
      <p className="text-xs text-muted-foreground">
        Pianificato {plannedMin} min · TSS {Math.round(plannedTss)}
      </p>
    );
  }
  const durationPct = durationDeltaPct(plannedMin, actualMin);
  return (
    <p className="text-xs text-muted-foreground">
      {plannedMin} min → {actualMin} min ({formatDelta(durationPct)}) · TSS{" "}
      {Math.round(plannedTss)} →{" "}
      {actualTss === null ? "—" : Math.round(actualTss)}
    </p>
  );
}
