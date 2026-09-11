"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  SITUATION_TAG_OPTIONS,
  type SituationTag,
} from "@/lib/feedback/constants";
import type { WeekAdaptCandidate } from "@/lib/feedback/adapt-weeks";
import { SITUATION_TAG_LABEL } from "@/lib/feedback/labels";
import { requestWeekAdapt } from "@/server/actions/adapt-week";
import type { ExtraLoadHint } from "@/server/actions/adapt-week";

export function AdaptWeekSheet({
  programId,
  weeks,
  extraLoad,
  disabledReason,
  initialOpen = false,
}: {
  programId: string;
  weeks: WeekAdaptCandidate[];
  extraLoad: ExtraLoadHint[];
  disabledReason?: string | null;
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen && weeks.length > 0);
  const [weekId, setWeekId] = useState(weeks[0]?.id ?? "");
  const [tags, setTags] = useState<SituationTag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selected = weeks.find((week) => week.id === weekId) ?? weeks[0];

  function toggleTag(tag: SituationTag) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((row) => row !== tag)
        : [...current, tag],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      return;
    }
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("programId", programId);
    formData.set("weekId", selected.id);
    for (const tag of tags) {
      formData.append("situationTags", tag);
    }
    const result = await requestWeekAdapt(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (weeks.length === 0 && !disabledReason) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={Boolean(disabledReason) || weeks.length === 0}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Chiudi" : "Adatta il programma"}
      </Button>
      {disabledReason ? (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
      {open && selected ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
        >
          {weeks.length > 1 ? (
            <label className="flex flex-col gap-1 text-sm">
              <span>Quale settimana</span>
              <select
                value={selected.id}
                onChange={(event) => setWeekId(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                {weeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    Settimana {week.number} · {week.remainingCount}{" "}
                    {week.remainingCount === 1
                      ? "seduta rimasta"
                      : "sedute rimaste"}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm font-medium">
              Settimana {selected.number} · {selected.remainingCount}{" "}
              {selected.remainingCount === 1
                ? "seduta rimasta"
                : "sedute rimaste"}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Racconta cosa è successo (malattia, infortunio, trekking, viaggio,
            poco tempo). Pacely propone un ricalcolo: niente viene applicato
            senza la tua approvazione.
          </p>
          {extraLoad.length > 0 ? (
            <ul className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
              {extraLoad.map((row) => (
                <li key={`${row.startedAt}-${row.name ?? "extra"}`}>
                  Extra: {row.name ?? "attività Strava"} · {row.durationMin} min
                  {row.tssEstimate > 0
                    ? ` · TSS ~${Math.round(row.tssEstimate)}`
                    : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {SITUATION_TAG_OPTIONS.map((tag) => {
              const selectedTag = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={
                    selectedTag
                      ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium"
                      : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                  }
                >
                  {SITUATION_TAG_LABEL[tag]}
                </button>
              );
            })}
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span>Cosa è successo</span>
            <textarea
              name="situationText"
              rows={3}
              maxLength={2000}
              placeholder="Es. ieri trekking esaustivo, lunedì non posso fare il tempo."
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:max-w-xs">
            <span>Limite minuti (opzionale)</span>
            <input
              type="number"
              name="timeCapMin"
              min={15}
              max={240}
              placeholder="es. 30"
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            className="self-start"
          >
            {pending ? "Calcolo in corso…" : "Proponi adattamento"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
