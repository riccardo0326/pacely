"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WORKOUT_STATUS } from "@/lib/matching/constants";
import {
  linkWorkoutActivity,
  skipWorkout,
  unlinkWorkoutActivity,
  unskipWorkout,
} from "@/server/actions/calendar";
import type { CalendarWorkoutCard } from "@/server/actions/calendar";

function formatActivityOption(
  activity: CalendarWorkoutCard["candidates"][number],
): string {
  const time = new Date(activity.startedAt).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  const name = activity.name?.trim() || "Attività Strava";
  return `${name} · ${time} · ${activity.durationMin} min`;
}

export function WorkoutMatchControls({
  workout,
}: {
  workout: CalendarWorkoutCard;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(
    action: (
      formData: FormData,
    ) => Promise<{ ok: true } | { ok: false; error: string }>,
    formData: FormData,
  ) {
    setPending(true);
    setError(null);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(linkWorkoutActivity, new FormData(event.currentTarget));
  }

  async function handleUnlink() {
    const formData = new FormData();
    formData.set("workoutId", workout.id);
    await run(unlinkWorkoutActivity, formData);
  }

  async function handleSkip() {
    const formData = new FormData();
    formData.set("workoutId", workout.id);
    await run(skipWorkout, formData);
  }

  async function handleUnskip() {
    const formData = new FormData();
    formData.set("workoutId", workout.id);
    await run(unskipWorkout, formData);
  }

  const canLink = workout.candidates.length > 0;
  const isCompleted = workout.status === WORKOUT_STATUS.completed;
  const isSkipped = workout.status === WORKOUT_STATUS.skipped;

  return (
    <div className="mt-2 flex flex-col gap-2">
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {canLink ? (
        <form onSubmit={handleLink} className="flex flex-col gap-1.5">
          <input type="hidden" name="workoutId" value={workout.id} />
          <label className="sr-only" htmlFor={`activity-${workout.id}`}>
            Abbina attività
          </label>
          <select
            id={`activity-${workout.id}`}
            name="activityId"
            required
            disabled={pending}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
            defaultValue={workout.candidates[0]?.id}
          >
            {workout.candidates.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {formatActivityOption(activity)}
              </option>
            ))}
          </select>
          <Button type="submit" size="xs" variant="outline" disabled={pending}>
            {isCompleted ? "Cambia abbinamento" : "Abbina attività"}
          </Button>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {isCompleted ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={handleUnlink}
          >
            Scollega
          </Button>
        ) : null}
        {isSkipped ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={handleUnskip}
          >
            Ripristina
          </Button>
        ) : (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={handleSkip}
          >
            Segna saltato
          </Button>
        )}
      </div>
    </div>
  );
}
