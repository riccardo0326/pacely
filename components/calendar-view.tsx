import Link from "next/link";
import { Bike, Coffee, PersonStanding, WavesLadder } from "lucide-react";
import { CalendarNav } from "@/components/calendar-nav";
import { EmptyState } from "@/components/empty-state";
import {
  PlannedVsActualSummary,
  WorkoutComparison,
} from "@/components/planned-vs-actual";
import { WorkoutStatusBadge } from "@/components/status-badge";
import { WorkoutFeedbackForm } from "@/components/workout-feedback-form";
import { WorkoutMatchControls } from "@/components/workout-match-controls";
import { Button } from "@/components/ui/button";
import { MATCH_SOURCE, WORKOUT_STATUS } from "@/lib/matching/constants";
import { routes } from "@/lib/routes";
import { sportBadgeClass, sportLabel } from "@/lib/ui/theme";
import { cn } from "@/lib/utils";
import type {
  CalendarData,
  CalendarDay,
  CalendarWorkoutCard,
} from "@/server/actions/calendar";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function SportIcon({
  sport,
  className,
}: {
  sport: string;
  className?: string;
}) {
  if (sport === "swim") {
    return <WavesLadder className={className} aria-hidden />;
  }
  if (sport === "ride") {
    return <Bike className={className} aria-hidden />;
  }
  return <PersonStanding className={className} aria-hidden />;
}

function sportDotClass(sport: string): string {
  if (sport === "swim") {
    return "bg-sport-swim";
  }
  if (sport === "ride") {
    return "bg-sport-ride";
  }
  return "bg-sport-run";
}

function formatDayHeading(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("it-IT", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatFullDayHeading(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("it-IT", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function dayHref(date: string): string {
  return `${routes.calendar}?view=day&date=${date}`;
}

function WorkoutCard({
  workout,
  size = "compact",
}: {
  workout: CalendarWorkoutCard;
  size?: "compact" | "full";
}) {
  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-card",
        size === "full" ? "p-4" : "p-2",
        workout.status === WORKOUT_STATUS.skipped && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="flex items-center gap-1 text-xs font-medium">
          <SportIcon sport={workout.sport} className="size-3.5" />
          {sportLabel(workout.sport)}
          {workout.timeOfDay ? ` · ${workout.timeOfDay}` : ""}
        </p>
        <WorkoutStatusBadge status={workout.status} />
      </div>
      <Link
        href={routes.program(workout.programId)}
        className="mt-0.5 block text-sm font-medium hover:underline"
      >
        {workout.name}
      </Link>
      <WorkoutComparison
        plannedMin={workout.durationMin}
        actualMin={workout.activity?.durationMin ?? null}
        plannedTss={workout.tss}
        actualTss={workout.activity?.tss ?? null}
      />
      {workout.activity ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {workout.activity.name ?? "Attività Strava"}
          {workout.matchSource === MATCH_SOURCE.manual
            ? " · abbinato a mano"
            : " · abbinato in automatico"}
        </p>
      ) : null}
      <WorkoutMatchControls workout={workout} />
      <WorkoutFeedbackForm
        workoutId={workout.id}
        status={workout.status}
        feedback={workout.feedback}
      />
    </article>
  );
}

function UnplannedCard({
  name,
  durationMin,
  size = "compact",
}: {
  name: string | null;
  durationMin: number;
  size?: "compact" | "full";
}) {
  return (
    <article
      className={cn(
        "rounded-lg border border-dashed border-border",
        size === "full" ? "p-4" : "p-2",
      )}
    >
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        Fuori piano
      </p>
      <p className="text-sm">{name ?? "Attività Strava"}</p>
      <p className="text-xs text-muted-foreground">{durationMin} min</p>
    </article>
  );
}

function RestHint() {
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Coffee className="size-3.5" aria-hidden />
      Riposo
    </p>
  );
}

function WeekDayColumn({ day }: { day: CalendarDay }) {
  return (
    <section
      className={cn(
        "flex min-h-40 min-w-[15.5rem] shrink-0 snap-start flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:min-w-0 sm:shrink",
        day.isToday && "ring-2 ring-primary/40",
      )}
    >
      <h3 className="text-sm font-medium capitalize">
        <Link href={dayHref(day.date)} className="hover:underline">
          {formatDayHeading(day.date)}
        </Link>
      </h3>
      {day.workouts.length === 0 && day.unplannedActivities.length === 0 ? (
        <RestHint />
      ) : null}
      {day.workouts.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
      {day.unplannedActivities.map((activity) => (
        <UnplannedCard
          key={activity.id}
          name={activity.name}
          durationMin={activity.durationMin}
        />
      ))}
    </section>
  );
}

function DayBoard({ day }: { day: CalendarDay }) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5",
        day.isToday && "ring-2 ring-primary/40",
      )}
    >
      <h3 className="text-lg font-semibold capitalize">
        {formatFullDayHeading(day.date)}
      </h3>
      {day.workouts.length === 0 && day.unplannedActivities.length === 0 ? (
        <RestHint />
      ) : null}
      {day.workouts.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} size="full" />
      ))}
      {day.unplannedActivities.map((activity) => (
        <UnplannedCard
          key={activity.id}
          name={activity.name}
          durationMin={activity.durationMin}
          size="full"
        />
      ))}
    </section>
  );
}

function MonthCell({ day }: { day: CalendarDay }) {
  const dayNum = Number(day.date.slice(8, 10));
  const overflow = day.workouts.length - 3;
  return (
    <Link
      href={dayHref(day.date)}
      className={cn(
        "flex min-h-11 flex-col gap-1 rounded-lg border border-border bg-card p-1 text-left hover:bg-muted/40 sm:min-h-24 sm:p-1.5",
        !day.inMonth && "opacity-40",
        day.isToday && "ring-2 ring-primary/40",
      )}
    >
      <span className="text-xs tabular-nums">{dayNum}</span>
      <span className="flex flex-wrap gap-0.5 sm:hidden">
        {day.workouts.slice(0, 4).map((workout) => (
          <span
            key={workout.id}
            className={cn(
              "size-1.5 rounded-full",
              sportDotClass(workout.sport),
            )}
          />
        ))}
      </span>
      <span className="hidden flex-col gap-1 sm:flex">
        {day.workouts.slice(0, 3).map((workout) => (
          <span
            key={workout.id}
            className={cn(
              "flex items-center gap-0.5 truncate rounded px-1 py-0.5 text-[11px] font-medium",
              sportBadgeClass(workout.sport),
            )}
          >
            <SportIcon sport={workout.sport} className="size-3 shrink-0" />
            <span className="truncate">{sportLabel(workout.sport)}</span>
            {workout.status === WORKOUT_STATUS.completed ? (
              <span className="ml-auto size-1.5 shrink-0 rounded-full bg-emerald-500" />
            ) : null}
          </span>
        ))}
        {overflow > 0 ? (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
            +{overflow}
          </span>
        ) : null}
        {day.unplannedActivities.length > 0 ? (
          <span className="text-[10px] text-muted-foreground">
            {day.unplannedActivities.length} fuori piano
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function CalendarView({ data }: { data: CalendarData }) {
  const day = data.view === "day" ? data.days[0] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <CalendarNav
        view={data.view}
        focus={data.focus}
        rangeStart={data.rangeStart}
        rangeEnd={data.rangeEnd}
      />
      {!data.hasActiveProgram ? (
        <EmptyState
          title="Nessun programma attivo"
          description="Il calendario mostra gli allenamenti dei programmi attivi."
          action={
            <Button asChild>
              <Link href={routes.programNew}>Crea un programma</Link>
            </Button>
          }
        />
      ) : (
        <PlannedVsActualSummary totals={data.totals} />
      )}
      {data.view === "day" && day ? (
        <div className="mx-auto w-full max-w-xl">
          <DayBoard day={day} />
        </div>
      ) : data.view === "week" ? (
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x sm:grid sm:grid-cols-7 sm:overflow-visible sm:pb-0">
          {data.days.map((column) => (
            <WeekDayColumn key={column.date} day={column} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <p
                key={label}
                className="text-center text-[10px] font-medium text-muted-foreground sm:text-xs"
              >
                {label}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {data.days.map((cell) => (
              <MonthCell key={cell.date} day={cell} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
