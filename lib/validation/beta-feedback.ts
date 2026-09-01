import { z } from "zod";

export const BETA_FEEDBACK_CATEGORIES = ["bug", "ux", "idea", "other"] as const;
export type BetaFeedbackCategory = (typeof BETA_FEEDBACK_CATEGORIES)[number];

export const BETA_FEEDBACK_CATEGORY_LABEL: Record<
  BetaFeedbackCategory,
  string
> = {
  bug: "Problema / bug",
  ux: "Esperienza d'uso",
  idea: "Idea / miglioramento",
  other: "Altro",
};

export const betaFeedbackFormSchema = z.object({
  category: z.enum(BETA_FEEDBACK_CATEGORIES),
  message: z
    .string()
    .trim()
    .min(10, "Scrivi almeno 10 caratteri")
    .max(2000, "Massimo 2000 caratteri"),
});
export type BetaFeedbackForm = z.infer<typeof betaFeedbackFormSchema>;
