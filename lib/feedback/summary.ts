import type { FeedbackAnalysisOutput } from "@/lib/llm/schemas";
import { storedFeedbackAnalysisSchema } from "@/lib/validation/feedback";

export type FeedbackSummary = {
  id: string;
  perceivedExertion: number | null;
  planDeviation: FeedbackAnalysisOutput["planDeviation"];
  deviationSummary: string;
  externalFactors: FeedbackAnalysisOutput["externalFactors"];
};

export function parseFeedbackAnalysis(
  raw: unknown,
): FeedbackAnalysisOutput | null {
  const parsed = storedFeedbackAnalysisSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function feedbackSummaryFromRow(
  id: string,
  analysisRaw: unknown,
): FeedbackSummary | null {
  const analysis = parseFeedbackAnalysis(analysisRaw);
  if (!analysis) {
    return null;
  }
  return {
    id,
    perceivedExertion: analysis.perceivedExertion,
    planDeviation: analysis.planDeviation,
    deviationSummary: analysis.deviationSummary,
    externalFactors: analysis.externalFactors,
  };
}
