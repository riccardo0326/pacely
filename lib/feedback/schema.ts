import { z } from "zod";
import { workoutBlockSchema } from "@/lib/llm/schemas";
import { RECALC_ACTION } from "@/lib/feedback/constants";

const fromToNumber = z.object({
  from: z.number(),
  to: z.number(),
});

const fromToString = z.object({
  from: z.string(),
  to: z.string(),
});

const fromToInt = z.object({
  from: z.number().int(),
  to: z.number().int(),
});

export const recalcActionSchema = z.enum([
  RECALC_ACTION.reduceLoad,
  RECALC_ACTION.shiftRestDay,
  RECALC_ACTION.extendRecovery,
]);

export const recalcWorkoutPatchSchema = z.object({
  workoutId: z.string().min(1),
  weekId: z.string().min(1),
  name: fromToString.optional(),
  durationMin: fromToInt.optional(),
  tss: fromToNumber.optional(),
  dayOfWeek: fromToInt.optional(),
  plannedDate: fromToString.optional(),
  blocks: z.array(workoutBlockSchema).optional(),
});
export type RecalcWorkoutPatch = z.infer<typeof recalcWorkoutPatchSchema>;

export const recalcWeekPatchSchema = z.object({
  weekId: z.string().min(1),
  weekLoadTarget: fromToNumber,
});

export const recalcChangesSchema = z.object({
  action: recalcActionSchema,
  workouts: z.array(recalcWorkoutPatchSchema).min(1),
  weeks: z.array(recalcWeekPatchSchema),
});
export type RecalcChanges = z.infer<typeof recalcChangesSchema>;
