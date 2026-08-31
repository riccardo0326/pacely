import { z } from "zod";

export const sportDayLoadSchema = z.object({
  tss: z.number(),
  durationSec: z.number().nonnegative(),
  activityCount: z.number().int().nonnegative(),
});

export const sportBreakdownSchema = z.object({
  run: sportDayLoadSchema.optional(),
  swim: sportDayLoadSchema.optional(),
  ride: sportDayLoadSchema.optional(),
});
