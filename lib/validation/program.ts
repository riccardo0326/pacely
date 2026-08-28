import { z } from "zod";
import {
  availableSlotSchema,
  sportSchema,
  workoutBlockSchema,
} from "@/lib/llm/schemas";

export const programStatusSchema = z.enum([
  "draft",
  "active",
  "completed",
  "archived",
]);
export type ProgramStatus = z.infer<typeof programStatusSchema>;

export const workoutStatusSchema = z.enum(["planned", "completed", "skipped"]);
export type WorkoutStatus = z.infer<typeof workoutStatusSchema>;

export const createProgramFormSchema = z
  .object({
    sports: z.array(sportSchema).min(1).max(3),
    durationWeeks: z.coerce.number().int().min(4).max(12),
    startDate: z.string().min(1),
    goalType: z.enum(["race", "generic"]),
    goalDescription: z.string().min(3).max(500),
    raceType: z.string().max(100).optional(),
    raceDistance: z.string().max(100).optional(),
    raceDate: z.string().optional(),
    constraints: z.string().max(1000).optional(),
    slots: z
      .array(
        z.object({
          weekday: z.coerce.number().int().min(0).max(6),
          timeOfDay: z.string().max(20).optional(),
        }),
      )
      .min(1)
      .max(7),
  })
  .superRefine((value, ctx) => {
    if (value.goalType === "race") {
      if (!value.raceDate) {
        ctx.addIssue({
          code: "custom",
          message: "La data gara è obbligatoria per un obiettivo gara",
          path: ["raceDate"],
        });
      }
      if (!value.raceDistance?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "La distanza è obbligatoria per un obiettivo gara",
          path: ["raceDistance"],
        });
      }
    }
  });
export type CreateProgramForm = z.infer<typeof createProgramFormSchema>;

export const updateWorkoutFormSchema = z.object({
  workoutId: z.string().min(1),
  name: z.string().min(1).max(200),
  durationMin: z.coerce.number().int().positive().max(600),
  tss: z.coerce.number().nonnegative().max(500),
  timeOfDay: z.string().max(20).optional(),
  blocks: z.array(workoutBlockSchema).min(1),
});
export type UpdateWorkoutForm = z.infer<typeof updateWorkoutFormSchema>;

export const storedAvailableSlotsSchema = z.array(availableSlotSchema);
export type StoredAvailableSlots = z.infer<typeof storedAvailableSlotsSchema>;
