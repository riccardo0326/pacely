"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WORKOUT_STATUS } from "@/lib/matching/constants";
import { linkWorkoutActivity } from "@/server/actions/calendar";
import type {
  CalendarActivityCard,
  CalendarWorkoutCard,
} from "@/server/actions/calendar";

function formatWorkoutOption(workout: CalendarWorkoutCard): string {
  const day = new Date(
    `${workout.plannedDate}T00:00:00.000Z`,
  ).toLocaleDateString("it-IT", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${day} · ${workout.name} · ${workout.durationMin} min`;
}

export function UnplannedMatchControls({
  activity,
  workouts,
}: {
  activity: CalendarActivityCard;
  workouts: CalendarWorkoutCard[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const options = workouts.filter(
    (workout) =>
      workout.sport === activity.sport &&
      workout.status === WORKOUT_STATUS.planned &&
      !workout.activity,
  );

  if (options.length === 0) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await linkWorkoutActivity(new FormData(event.currentTarget));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-1.5">
      <input type="hidden" name="activityId" value={activity.id} />
      <label className="sr-only" htmlFor={`unplanned-${activity.id}`}>
        Abbina a un allenamento di un altro giorno
      </label>
      <select
        id={`unplanned-${activity.id}`}
        name="workoutId"
        required
        disabled={pending}
        className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
        defaultValue={options[0]?.id}
      >
        {options.map((workout) => (
          <option key={workout.id} value={workout.id}>
            {formatWorkoutOption(workout)}
          </option>
        ))}
      </select>
      <Button type="submit" size="xs" variant="outline" disabled={pending}>
        Era un altro allenamento
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
