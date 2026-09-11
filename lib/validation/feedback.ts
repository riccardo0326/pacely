import { z } from "zod";
import {
  feedbackAnalysisOutputSchema,
  situationTagSchema,
} from "@/lib/llm/schemas";

export const submitFeedbackFormSchema = z.object({
  workoutId: z.string().min(1),
  freeText: z.string().trim().min(10).max(2000),
});
export type SubmitFeedbackForm = z.infer<typeof submitFeedbackFormSchema>;

export const proposalIdFormSchema = z.object({
  proposalId: z.string().min(1),
});

export const storedFeedbackAnalysisSchema = feedbackAnalysisOutputSchema;

export const requestWeekAdaptFormSchema = z
  .object({
    programId: z.string().min(1),
    weekId: z.string().min(1),
    situationText: z.string().trim().max(2000),
    situationTags: z.array(situationTagSchema).max(8),
    timeCapMin: z.coerce.number().int().positive().max(240).optional(),
    timeCapDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.situationTags.length === 0 && value.situationText.length < 10) {
      ctx.addIssue({
        code: "custom",
        message:
          "Descrivi la situazione (almeno 10 caratteri) o scegli un motivo.",
        path: ["situationText"],
      });
    }
  });
export type RequestWeekAdaptForm = z.infer<typeof requestWeekAdaptFormSchema>;
