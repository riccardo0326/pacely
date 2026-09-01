"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BETA_FEEDBACK_CATEGORIES,
  BETA_FEEDBACK_CATEGORY_LABEL,
} from "@/lib/validation/beta-feedback";
import { submitBetaFeedback } from "@/server/actions/beta-feedback";

export function BetaFeedbackForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const result = await submitBetaFeedback(new FormData(form));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    form.reset();
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-medium">Grazie</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Il messaggio è stato salvato.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => setSent(false)}
        >
          Invia un altro feedback
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Categoria</span>
        <select
          name="category"
          required
          disabled={pending}
          defaultValue="bug"
          className="rounded-lg border border-border bg-background px-3 py-2"
        >
          {BETA_FEEDBACK_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {BETA_FEEDBACK_CATEGORY_LABEL[category]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Cosa è successo?</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          disabled={pending}
          placeholder="Descrivi il problema, cosa ti aspettavi, e su quale schermata (dashboard, calendario, generazione programma…)."
          className="rounded-lg border border-border bg-background px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="self-start" disabled={pending}>
        {pending ? "Invio…" : "Invia feedback"}
      </Button>
    </form>
  );
}
