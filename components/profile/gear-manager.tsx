"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  GEAR_KIND,
  GEAR_KIND_LABELS,
  allowedGearKinds,
  type GearKind,
} from "@/lib/profile/constants";
import { SPORT_LABELS, SPORTS, type Sport } from "@/lib/strava/constants";
import { sportBadgeClass } from "@/lib/ui/theme";
import { cn } from "@/lib/utils";
import {
  createGear,
  deleteGear,
  updateGear,
  type GearView,
} from "@/server/actions/profile";

type GearManagerProps = {
  gear: GearView[];
};

function formatDistance(distanceM: number | null): string | null {
  if (distanceM == null) {
    return null;
  }
  const km = distanceM / 1000;
  return `${km.toFixed(km >= 100 ? 0 : 1)} km`;
}

export function GearManager({ gear }: GearManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sport, setSport] = useState<Sport>("run");
  const kinds = useMemo(() => allowedGearKinds(sport), [sport]);
  const [kind, setKind] = useState<GearKind>(kinds[0] ?? GEAR_KIND.accessory);

  function changeSport(next: Sport) {
    setSport(next);
    const nextKinds = allowedGearKinds(next);
    setKind(nextKinds[0] ?? GEAR_KIND.accessory);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingId("new");
    setError(null);
    const result = await createGear(new FormData(event.currentTarget));
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const gearId = String(new FormData(form).get("gearId") ?? "");
    setPendingId(gearId);
    setError(null);
    const result = await updateGear(new FormData(form));
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete(gearId: string) {
    setPendingId(gearId);
    setError(null);
    const formData = new FormData();
    formData.set("gearId", gearId);
    const result = await deleteGear(formData);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-medium">Attrezzatura</h2>
      {gear.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Nessuna attrezzatura ancora. Sincronizza da Strava o aggiungila qui.
        </p>
      ) : (
        <ul className="mb-6 flex flex-col gap-3">
          {gear.map((item) => {
            const fromStrava = Boolean(item.stravaGearId);
            const distance = formatDistance(item.distanceM);
            const busy = pendingId === item.id;
            return (
              <li
                key={item.id}
                className="rounded-lg border border-border px-3 py-3"
              >
                <form
                  onSubmit={handleUpdate}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <input type="hidden" name="gearId" value={item.id} />
                  <input type="hidden" name="sport" value={item.sport} />
                  <input type="hidden" name="kind" value={item.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          sportBadgeClass(item.sport),
                        )}
                      >
                        {SPORT_LABELS[item.sport as Sport] ?? item.sport}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {GEAR_KIND_LABELS[item.kind as GearKind] ?? item.kind}
                      </span>
                      {fromStrava ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                          Strava
                        </span>
                      ) : null}
                      {distance ? (
                        <span className="text-xs text-muted-foreground">
                          {distance}
                        </span>
                      ) : null}
                    </div>
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="sr-only">Nome</span>
                      <input
                        type="text"
                        name="name"
                        required
                        maxLength={80}
                        defaultValue={item.name}
                        disabled={busy}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2"
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="isPrimary"
                      defaultChecked={item.isPrimary}
                      disabled={busy}
                    />
                    Primaria
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={busy}>
                      {busy ? "…" : "Salva"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void handleDelete(item.id)}
                    >
                      Elimina
                    </Button>
                  </div>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleCreate} className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Aggiungi pezzo</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Sport</span>
            <select
              name="sport"
              value={sport}
              onChange={(event) => changeSport(event.target.value as Sport)}
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              {SPORTS.map((value) => (
                <option key={value} value={value}>
                  {SPORT_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Tipo</span>
            <select
              name="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as GearKind)}
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              {kinds.map((value) => (
                <option key={value} value={value}>
                  {GEAR_KIND_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Nome</span>
            <input
              type="text"
              name="name"
              required
              maxLength={80}
              placeholder="es. Nike Pegasus"
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPrimary" />
          Segna come primaria per questo tipo
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div>
          <Button type="submit" size="sm" disabled={pendingId === "new"}>
            {pendingId === "new" ? "Aggiunta…" : "Aggiungi"}
          </Button>
        </div>
      </form>
    </section>
  );
}
