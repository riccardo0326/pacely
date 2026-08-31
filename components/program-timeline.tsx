"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  parseEditableBlocks,
  toStoredWorkoutBlocks,
  type EditableBlock,
} from "@/lib/programs/blocks";
import { updateWorkout } from "@/server/actions/programs";
import type { ProgramDetail } from "@/server/actions/programs";

const SPORT_LABEL: Record<string, string> = {
  run: "Corsa",
  swim: "Nuoto",
  ride: "Ciclismo",
};

const WEEKDAY_LABEL = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

const BLOCK_TYPES = [
  { value: "warm-up", label: "Riscaldamento" },
  { value: "main-set", label: "Parte principale" },
  { value: "cool-down", label: "Defaticamento" },
] as const;

const METRIC_OPTIONS = [
  { value: "", label: "Nessuna" },
  { value: "hr", label: "FC" },
  { value: "pace", label: "Passo" },
  { value: "power", label: "Potenza" },
] as const;

function WorkoutEditor({
  workout,
}: {
  workout: ProgramDetail["weeks"][number]["workouts"][number];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState<EditableBlock[]>(() =>
    parseEditableBlocks(workout.blocks),
  );

  function addBlock() {
    setBlocks((current) => [
      ...current,
      {
        type: "main-set",
        durationMin: 10,
        description: "",
        zone: "",
        metric: "",
      },
    ]);
  }

  function removeBlock(index: number) {
    setBlocks((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current,
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("workoutId", workout.id);
    formData.set("blocks", JSON.stringify(toStoredWorkoutBlocks(blocks)));
    const result = await updateWorkout(formData);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
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
          onClick={() => {
            setBlocks(parseEditableBlocks(workout.blocks));
            setOpen((value) => !value);
          }}
        >
          {open ? "Chiudi" : "Modifica"}
        </Button>
      </div>

      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {parseEditableBlocks(workout.blocks).map((block, index) => (
          <li key={index}>
            {block.type}: {block.durationMin} min — {block.description || "—"}
            {block.zone ? ` · Z${block.zone}` : ""}
            {block.metric ? ` · ${block.metric}` : ""}
          </li>
        ))}
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

          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium">Blocchi</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBlock}
            >
              Aggiungi blocco
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {blocks.map((block, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2"
              >
                <label className="flex flex-col gap-1 text-sm">
                  <span>Tipo</span>
                  <select
                    value={block.type}
                    onChange={(event) =>
                      setBlocks((current) =>
                        current.map((row, i) =>
                          i === index
                            ? {
                                ...row,
                                type: event.target
                                  .value as EditableBlock["type"],
                              }
                            : row,
                        ),
                      )
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  >
                    {BLOCK_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>Durata (min)</span>
                  <input
                    type="number"
                    min={1}
                    value={block.durationMin}
                    onChange={(event) =>
                      setBlocks((current) =>
                        current.map((row, i) =>
                          i === index
                            ? {
                                ...row,
                                durationMin: Number(event.target.value),
                              }
                            : row,
                        ),
                      )
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  <span>Descrizione</span>
                  <input
                    value={block.description}
                    onChange={(event) =>
                      setBlocks((current) =>
                        current.map((row, i) =>
                          i === index
                            ? { ...row, description: event.target.value }
                            : row,
                        ),
                      )
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>Zona (1–5)</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={block.zone}
                    onChange={(event) =>
                      setBlocks((current) =>
                        current.map((row, i) =>
                          i === index
                            ? { ...row, zone: event.target.value }
                            : row,
                        ),
                      )
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>Metrica</span>
                  <select
                    value={block.metric}
                    onChange={(event) =>
                      setBlocks((current) =>
                        current.map((row, i) =>
                          i === index
                            ? { ...row, metric: event.target.value }
                            : row,
                        ),
                      )
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  >
                    {METRIC_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="sm:col-span-2 self-start"
                  onClick={() => removeBlock(index)}
                >
                  Rimuovi blocco
                </Button>
              </div>
            ))}
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

export function ProgramTimeline({ program }: { program: ProgramDetail }) {
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
