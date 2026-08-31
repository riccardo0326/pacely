export const NOTIFICATION_TYPE = {
  workoutToday: "workout_today",
  recalcProposal: "recalc_proposal",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const NOTIFICATION_TYPES = Object.values(NOTIFICATION_TYPE);

export const PROGRAM_STATUS_ACTIVE = "active";

/** Cap daily workout reminders per cron run (push fan-out, no LLM). */
export const NOTIFICATION_CRON_MAX_USERS = 50;

export const SW_PATH = "/sw.js";
