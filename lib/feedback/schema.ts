import { z } from "zod";
import { workoutBlockSchema } from "@/lib/llm/schemas";
import {
  ADAPT_STRATEGY,
  RECALC_ACTION,
  RECALC_OP,
} from "@/lib/feedback/constants";

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
  RECALC_ACTION.adaptWeek,
]);

export const recalcOpSchema = z.enum([
  RECALC_OP.scale,
  RECALC_OP.retype,
  RECALC_OP.move,
  RECALC_OP.skip,
  RECALC_OP.swap,
]);

export const adaptStrategySchema = z.enum([
  ADAPT_STRATEGY.recover,
  ADAPT_STRATEGY.reshape,
  ADAPT_STRATEGY.postponeQuality,
  ADAPT_STRATEGY.timebox,
]);

export const recalcWorkoutPatchSchema = z.object({
  workoutId: z.string().min(1),
  weekId: z.string().min(1),
  op: recalcOpSchema.optional(),
  name: fromToString.optional(),
  durationMin: fromToInt.optional(),
  tss: fromToNumber.optional(),
  dayOfWeek: fromToInt.optional(),
  plannedDate: fromToString.optional(),
  status: z
    .object({
      from: z.string(),
      to: z.enum(["planned", "skipped"]),
    })
    .optional(),
  sport: fromToString.optional(),
  blocks: z.array(workoutBlockSchema).optional(),
});
export type RecalcWorkoutPatch = z.infer<typeof recalcWorkoutPatchSchema>;

export const recalcWeekPatchSchema = z.object({
  weekId: z.string().min(1),
  weekLoadTarget: fromToNumber,
});

export const recalcChangesSchema = z.object({
  action: recalcActionSchema,
  strategy: adaptStrategySchema.optional(),
  workouts: z.array(recalcWorkoutPatchSchema).min(1),
  weeks: z.array(recalcWeekPatchSchema),
});
export type RecalcChanges = z.infer<typeof recalcChangesSchema>;
