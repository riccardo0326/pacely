import { SPORT_LABELS, type Sport } from "@/lib/strava/constants";
import { routes } from "@/lib/routes";
import { NOTIFICATION_TYPE } from "@/lib/notifications/constants";

export type WorkoutTodayItem = {
  name: string;
  sport: string;
  durationMin: number;
  timeOfDay?: string | null;
};

export type NotificationContent = {
  title: string;
  body: string;
  href: string;
};

function sportLabel(sport: string): string {
  if (sport in SPORT_LABELS) {
    return SPORT_LABELS[sport as Sport];
  }
  return sport;
}

function formatWorkoutLine(workout: WorkoutTodayItem): string {
  const parts = [
    sportLabel(workout.sport),
    workout.name,
    `${workout.durationMin} min`,
  ];
  if (workout.timeOfDay) {
    parts.push(workout.timeOfDay);
  }
  return parts.join(" · ");
}

export function workoutTodayDedupeKey(dateKey: string): string {
  return `${NOTIFICATION_TYPE.workoutToday}:${dateKey}`;
}

export function recalcProposalDedupeKey(proposalId: string): string {
  return `${NOTIFICATION_TYPE.recalcProposal}:${proposalId}`;
}

export function buildWorkoutTodayContent(
  workouts: WorkoutTodayItem[],
): NotificationContent {
  const count = workouts.length;
  const title =
    count <= 1 ? "Allenamento di oggi" : `${count} allenamenti oggi`;
  const body =
    count === 0
      ? "Hai allenamenti pianificati per oggi."
      : workouts.map(formatWorkoutLine).join("\n");
  return { title, body, href: routes.calendar };
}

export function buildRecalcProposalContent(input: {
  programName?: string;
  programId: string;
}): NotificationContent {
  const program = input.programName?.trim();
  const body = program
    ? `C'è una modifica a «${program}» in attesa di approvazione.`
    : "C'è una modifica al piano in attesa di approvazione.";
  return {
    title: "Proposta di ricalcolo",
    body,
    href: routes.program(input.programId),
  };
}
