"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateWorkout } from "@/server/actions/programs";
import type { ProgramDetail } from "@/server/actions/programs";

const SPORT_LABEL: Record<string, string> = {
  run: "Corsa",
  swim: "Nuoto",
  ride: "Ciclismo",
};

const WEEKDAY_LABEL = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

type WorkoutEditorProps = {
  workout: ProgramDetail["weeks"][number]["workouts"][number];
};

export function WorkoutEditor({ workout }: WorkoutEditorProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const blocks = Array.isArray(workout.blocks) ? workout.blocks : [];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("workoutId", workout.id);
    formData.set("blocks", JSON.stringify(blocks));
    const result = await updateWorkout(formData);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {WEEKDAY_LABEL[workout.dayOfWeek]}{" "}
            {new Date(workout.plannedDate).toLocaleDateString("it-IT")} ·{" "}
            {SPORT_LABEL[workout.sport] ?? workout.sport}
          </p>
          <h3 className="mt-1 font-medium">{workout.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {workout.durationMin} min · TSS {workout.tss.toFixed(0)}
            {workout.timeOfDay ? ` · ${workout.timeOfDay}` : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Chiudi" : "Modifica"}
        </Button>
      </div>

      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {blocks.map((block, index) => {
          const row = block as {
            type?: string;
            durationMin?: number;
            description?: string;
          };
          return (
            <li key={index}>
              {row.type}: {row.durationMin} min — {row.description}
            </li>
          );
        })}
      </ul>

      {open ? (
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-3 border-t pt-4"
        >
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nome</span>
            <input
              name="name"
              defaultValue={workout.name}
              required
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Durata (min)</span>
              <input
                name="durationMin"
                type="number"
                defaultValue={workout.durationMin}
                min={1}
                required
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">TSS</span>
              <input
                name="tss"
                type="number"
                step="0.1"
                defaultValue={workout.tss}
                min={0}
                required
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Orario</span>
              <input
                name="timeOfDay"
                type="time"
                defaultValue={workout.timeOfDay ?? ""}
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
          </div>
          <Button
            type="submit"
            size="sm"
            className="self-start"
            disabled={saving}
          >
            {saving ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

type ProgramTimelineProps = {
  program: ProgramDetail;
};

export function ProgramTimeline({ program }: ProgramTimelineProps) {
  return (
    <div className="flex flex-col gap-8">
      {program.weeks.map((week) => (
        <section key={week.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold">Settimana {week.number}</h2>
            <p className="text-sm text-muted-foreground">
              Target TSS {week.weekLoadTarget.toFixed(0)}
              {week.focus ? ` · ${week.focus}` : ""}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {week.workouts.map((workout) => (
              <WorkoutEditor key={workout.id} workout={workout} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
