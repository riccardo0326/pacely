import { WORKOUT_STATUS } from "@/lib/matching/constants";
import { SPORT_LABELS, type Sport } from "@/lib/strava/constants";
import type { ProgramStatus } from "@/lib/validation/program";

export const PMC_CSS = {
  ctl: "var(--pmc-ctl)",
  atl: "var(--pmc-atl)",
  tsb: "var(--pmc-tsb)",
} as const;

export const SPORT_BADGE_CLASS: Record<Sport, string> = {
  run: "bg-sport-run/15 text-sport-run",
  swim: "bg-sport-swim/15 text-sport-swim",
  ride: "bg-sport-ride/15 text-sport-ride",
};

export function isSport(value: string): value is Sport {
  return value === "run" || value === "swim" || value === "ride";
}

export function sportLabel(sport: string): string {
  if (isSport(sport)) {
    return SPORT_LABELS[sport];
  }
  return sport;
}

export function sportBadgeClass(sport: string): string {
  if (isSport(sport)) {
    return SPORT_BADGE_CLASS[sport];
  }
  return "bg-muted text-muted-foreground";
}

export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  draft: "Bozza",
  active: "Attivo",
  completed: "Completato",
  archived: "Archiviato",
};

export const PROGRAM_STATUS_CLASS: Record<ProgramStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  completed: "bg-primary/10 text-foreground",
  archived: "bg-muted text-muted-foreground",
};

export function isProgramStatus(value: string): value is ProgramStatus {
  return (
    value === "draft" ||
    value === "active" ||
    value === "completed" ||
    value === "archived"
  );
}

export const WORKOUT_STATUS_LABEL: Record<string, string> = {
  [WORKOUT_STATUS.planned]: "Pianificato",
  [WORKOUT_STATUS.completed]: "Completato",
  [WORKOUT_STATUS.skipped]: "Saltato",
};

export const WORKOUT_STATUS_CLASS: Record<string, string> = {
  [WORKOUT_STATUS.planned]: "bg-muted text-muted-foreground",
  [WORKOUT_STATUS.completed]:
    "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  [WORKOUT_STATUS.skipped]: "bg-muted text-muted-foreground",
};

export function stravaActivityUrl(stravaActivityId: string): string {
  return `https://www.strava.com/activities/${stravaActivityId}`;
}
