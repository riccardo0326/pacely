import { z } from "zod";

export const sportSchema = z.enum(["run", "swim", "ride"]);
export type Sport = z.infer<typeof sportSchema>;

export const currentMetricsSchema = z.object({
  ctl: z.number().optional(),
  atl: z.number().optional(),
  tsb: z.number().optional(),
  ftp: z.number().optional(),
  vdot: z.number().optional(),
  swimThresholdPaceSecPer100m: z.number().optional(),
});
export type CurrentMetrics = z.infer<typeof currentMetricsSchema>;

export const weeklyHistorySummarySchema = z.object({
  weekStart: z.string().min(1),
  tssBySport: z.record(z.string(), z.number()).optional(),
  hoursBySport: z.record(z.string(), z.number()).optional(),
  activityCount: z.number().int().nonnegative().optional(),
});

export const availableSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  timeOfDay: z.string().optional(),
});

export const goalInputSchema = z.object({
  type: z.enum(["race", "generic"]),
  description: z.string().min(1),
  raceType: z.string().optional(),
  distance: z.string().optional(),
  date: z.string().optional(),
});

export const programGenerationInputSchema = z.object({
  userId: z.string().min(1),
  sports: z.array(sportSchema).min(1).max(3),
  durationWeeks: z.number().int().min(1).max(16),
  availableSlots: z.array(availableSlotSchema).min(1),
  goal: goalInputSchema,
  constraints: z.string().optional(),
  weeklyTssBudget: z.number().positive(),
  currentMetrics: currentMetricsSchema,
  aggregatedHistory: z.object({
    weeklySummaries: z.array(weeklyHistorySummarySchema),
  }),
});
export type ProgramGenerationInput = z.infer<
  typeof programGenerationInputSchema
>;

export const intensityMetricSchema = z.enum(["hr", "pace", "power"]);

export const workoutBlockSchema = z.object({
  type: z.enum(["warm-up", "main-set", "cool-down"]),
  durationMin: z.number().positive(),
  description: z.string().min(1),
  target: z
    .object({
      zone: z.number().int().min(1).max(5).optional(),
      metric: intensityMetricSchema.optional(),
      description: z.string().optional(),
    })
    .optional(),
  repetitions: z.number().int().positive().optional(),
});
export type WorkoutBlock = z.infer<typeof workoutBlockSchema>;

export const plannedWorkoutSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  sport: sportSchema,
  name: z.string().min(1),
  durationMin: z.number().positive(),
  tss: z.number().nonnegative(),
  timeOfDay: z.string().optional(),
  blocks: z.array(workoutBlockSchema).min(1),
});

export const plannedWeekSchema = z.object({
  weekNumber: z.number().int().positive(),
  weekLoadTarget: z.number().nonnegative(),
  focus: z.string().optional(),
  workouts: z.array(plannedWorkoutSchema).min(1),
});

export const programGenerationOutputSchema = z.object({
  name: z.string().min(1),
  summary: z.string().min(1),
  weeks: z.array(plannedWeekSchema).min(1),
});
export type ProgramGenerationOutput = z.infer<
  typeof programGenerationOutputSchema
>;

export const feedbackAnalysisInputSchema = z.object({
  userId: z.string().min(1),
  freeText: z.string().min(1),
  sport: sportSchema.optional(),
  plannedTss: z.number().optional(),
  actualTss: z.number().optional(),
  plannedDurationMin: z.number().optional(),
  actualDurationMin: z.number().optional(),
});
export type FeedbackAnalysisInput = z.infer<typeof feedbackAnalysisInputSchema>;

export const externalFactorSchema = z.enum([
  "sleep",
  "stress",
  "illness",
  "weather",
  "nutrition",
  "other",
]);

export const feedbackAnalysisOutputSchema = z.object({
  perceivedExertion: z.number().min(1).max(10).nullable(),
  externalFactors: z.array(externalFactorSchema),
  factorNotes: z.string().optional(),
  planDeviation: z.enum(["none", "minor", "significant"]),
  deviationSummary: z.string().min(1),
  suggestedAction: z.enum([
    "none",
    "reduce_load",
    "shift_rest_day",
    "extend_recovery",
  ]),
});
export type FeedbackAnalysisOutput = z.infer<
  typeof feedbackAnalysisOutputSchema
>;

export const performanceAnalysisInputSchema = z.object({
  userId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  style: z.enum(["simple", "technical"]).optional(),
  metricTrends: z.object({
    ctlChange: z.number().optional(),
    atlChange: z.number().optional(),
    tsbChange: z.number().optional(),
    ftpChange: z.number().optional(),
    vdotChange: z.number().optional(),
    swimThresholdPaceChangeSec: z.number().optional(),
  }),
  feedbackSummaries: z.array(z.string()),
});
export type PerformanceAnalysisInput = z.infer<
  typeof performanceAnalysisInputSchema
>;

export const performanceReportOutputSchema = z.object({
  summary: z.string().min(1),
  strengths: z.array(z.string().min(1)).min(1),
  improvements: z.array(z.string().min(1)).min(1),
  suggestions: z.array(z.string().min(1)).min(1),
  style: z.enum(["simple", "technical"]).optional(),
});
export type PerformanceReportOutput = z.infer<
  typeof performanceReportOutputSchema
>;
