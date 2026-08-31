import { z } from "zod";
import { feedbackAnalysisOutputSchema } from "@/lib/llm/schemas";

export const submitFeedbackFormSchema = z.object({
  workoutId: z.string().min(1),
  freeText: z.string().trim().min(10).max(2000),
});
export type SubmitFeedbackForm = z.infer<typeof submitFeedbackFormSchema>;

export const proposalIdFormSchema = z.object({
  proposalId: z.string().min(1),
});

export const storedFeedbackAnalysisSchema = feedbackAnalysisOutputSchema;
