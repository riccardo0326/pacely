import { z } from "zod";

export const matchWorkoutFormSchema = z.object({
  workoutId: z.string().min(1),
  activityId: z.string().min(1),
});
export type MatchWorkoutForm = z.infer<typeof matchWorkoutFormSchema>;

export const workoutIdFormSchema = z.object({
  workoutId: z.string().min(1),
});
export type WorkoutIdForm = z.infer<typeof workoutIdFormSchema>;
