"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { nextMonday } from "@/lib/programs/dates";
import {
  looksLikeTriathlonGoal,
  missingTriathlonSports,
} from "@/lib/programs/constraints";
import { sportBadgeClass } from "@/lib/ui/theme";
import { cn } from "@/lib/utils";

const SPORT_OPTIONS = [
  { value: "run", label: "Corsa" },
  { value: "swim", label: "Nuoto" },
  { value: "ride", label: "Ciclismo" },
] as const;

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Lunedì" },
  { value: 2, label: "Martedì" },
  { value: 3, label: "Mercoledì" },
  { value: 4, label: "Giovedì" },
  { value: 5, label: "Venerdì" },
  { value: 6, label: "Sabato" },
  { value: 0, label: "Domenica" },
];

type SlotRow = { weekday: number; timeOfDay: string };

type ProgramCreateFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialError?: string;
};

export function ProgramCreateForm({
  action,
  initialError,
}: ProgramCreateFormProps) {
  const defaultStart = useMemo(
    () => nextMonday().toISOString().slice(0, 10),
    [],
  );
  const [goalType, setGoalType] = useState<"race" | "generic">("generic");
  const [sports, setSports] = useState<string[]>(["run"]);
  const [goalDescription, setGoalDescription] = useState("");
  const [raceType, setRaceType] = useState("");
  const [slots, setSlots] = useState<SlotRow[]>([
    { weekday: 1, timeOfDay: "07:00" },
    { weekday: 3, timeOfDay: "07:00" },
    { weekday: 5, timeOfDay: "07:00" },
  ]);

  function toggleSport(value: string) {
    setSports((current) => {
      if (current.includes(value)) {
        return current.length > 1
          ? current.filter((sport) => sport !== value)
          : current;
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, value];
    });
  }

  function addSlot() {
    setSlots((current) => [...current, { weekday: 1, timeOfDay: "" }]);
  }

  function removeSlot(index: number) {
    setSlots((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current,
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {initialError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {initialError}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Sport inclusi (1–3)</h2>
        {sports.map((sport) => (
          <input key={sport} type="hidden" name="sports" value={sport} />
        ))}
        <div className="flex flex-wrap gap-2">
          {SPORT_OPTIONS.map((option) => {
            const selected = sports.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-2 text-sm",
                  selected
                    ? sportBadgeClass(option.value)
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                <input
                  type="checkbox"
                  value={option.value}
                  checked={selected}
                  onChange={() => toggleSport(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
        {looksLikeTriathlonGoal(`${goalDescription} ${raceType}`) &&
        missingTriathlonSports(sports).length > 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Per un triathlon o mezzo Ironman seleziona corsa, nuoto e ciclismo.
            Ora il piano userà solo:{" "}
            {sports
              .map(
                (sport) =>
                  SPORT_OPTIONS.find((option) => option.value === sport)
                    ?.label ?? sport,
              )
              .join(", ")}
            .
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Durata (settimane)</span>
          <select
            name="durationWeeks"
            defaultValue={8}
            className="rounded-lg border border-border bg-background px-3 py-2"
          >
            {[4, 6, 8, 10, 12].map((weeks) => (
              <option key={weeks} value={weeks}>
                {weeks} settimane
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Data inizio</span>
          <input
            type="date"
            name="startDate"
            defaultValue={defaultStart}
            required
            className="rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Obiettivo</h2>
        <div className="flex gap-2">
          {(["generic", "race"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setGoalType(type)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                goalType === type
                  ? "border-primary bg-primary/10"
                  : "border-border"
              }`}
            >
              {type === "race" ? "Gara" : "Generico"}
            </button>
          ))}
        </div>
        <input type="hidden" name="goalType" value={goalType} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Descrizione obiettivo</span>
          <textarea
            name="goalDescription"
            required
            rows={3}
            value={goalDescription}
            onChange={(event) => setGoalDescription(event.target.value)}
            placeholder="Es. migliorare la base aerobica per un mezzo ironman"
            className="rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        {goalType === "race" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Tipo gara</span>
              <input
                name="raceType"
                placeholder="Es. mezzo ironman"
                value={raceType}
                onChange={(event) => setRaceType(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Distanza</span>
              <input
                name="raceDistance"
                placeholder="Es. 70.3"
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Data gara</span>
              <input
                type="date"
                name="raceDate"
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
              <span className="text-xs text-muted-foreground">
                Dopo l&apos;ultima settimana del piano. Controlla mese e giorno
                nel calendario (es. 8 novembre, non 11 agosto).
              </span>
            </label>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Giorni disponibili</h2>
          <Button type="button" variant="outline" size="sm" onClick={addSlot}>
            Aggiungi giorno
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {slots.map((slot, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span>Giorno</span>
                <select
                  name="slotWeekday"
                  value={slot.weekday}
                  onChange={(event) =>
                    setSlots((current) =>
                      current.map((row, i) =>
                        i === index
                          ? { ...row, weekday: Number(event.target.value) }
                          : row,
                      ),
                    )
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2"
                >
                  {WEEKDAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Orario (opz.)</span>
                <input
                  type="time"
                  name="slotTime"
                  value={slot.timeOfDay}
                  onChange={(event) =>
                    setSlots((current) =>
                      current.map((row, i) =>
                        i === index
                          ? { ...row, timeOfDay: event.target.value }
                          : row,
                      ),
                    )
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSlot(index)}
              >
                Rimuovi
              </Button>
            </div>
          ))}
        </div>
      </section>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Vincoli o infortuni (opz.)</span>
        <textarea
          name="constraints"
          rows={2}
          placeholder="Es. ginocchio destro sensibile, niente colli ripetuti"
          className="rounded-lg border border-border bg-background px-3 py-2"
        />
      </label>

      <GenerateSubmitButton />
    </form>
  );
}

function GenerateSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="submit" disabled={pending}>
        {pending ? "Generazione in corso…" : "Genera programma"}
      </Button>
      {pending ? (
        <p className="text-sm text-muted-foreground">
          Può richiedere fino a un minuto. Non chiudere la pagina.
        </p>
      ) : null}
    </div>
  );
}
