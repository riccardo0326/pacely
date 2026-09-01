"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WEIGHT_SOURCE } from "@/lib/profile/constants";
import {
  syncProfileFromStrava,
  updateProfile,
  type ProfileView,
} from "@/server/actions/profile";

type ProfileFormProps = {
  profile: ProfileView;
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const result = await updateProfile(new FormData(event.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice("Profilo salvato.");
    router.refresh();
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setNotice(null);
    const result = await syncProfileFromStrava();
    setSyncing(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice("Dati aggiornati da Strava.");
    router.refresh();
  }

  const weightFromStrava = profile.weightSource === WEIGHT_SOURCE.strava;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Dati personali</h2>
          {profile.lastStravaSyncedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Ultima sync Strava:{" "}
              {new Date(profile.lastStravaSyncedAt).toLocaleString("it-IT")}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncing || saving}
          onClick={() => void handleSync()}
        >
          {syncing ? "Sincronizzazione…" : "Sincronizza da Strava"}
        </Button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Peso (kg)</span>
            <input
              type="number"
              name="weightKg"
              inputMode="decimal"
              min={30}
              max={200}
              step="0.1"
              defaultValue={profile.weightKg ?? ""}
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
            {weightFromStrava ? (
              <span className="text-xs text-muted-foreground">
                Ultimo valore da Strava. Se lo modifichi, Pacely non lo
                sovrascrive più.
              </span>
            ) : null}
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Altezza (cm)</span>
            <input
              type="number"
              name="heightCm"
              inputMode="numeric"
              min={120}
              max={230}
              step="1"
              defaultValue={profile.heightCm ?? ""}
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Data di nascita</span>
            <input
              type="date"
              name="birthDate"
              defaultValue={profile.birthDate ?? ""}
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {notice ? (
          <p className="text-sm text-muted-foreground">{notice}</p>
        ) : null}

        <div>
          <Button type="submit" disabled={saving || syncing}>
            {saving ? "Salvataggio…" : "Salva profilo"}
          </Button>
        </div>
      </form>
    </section>
  );
}
