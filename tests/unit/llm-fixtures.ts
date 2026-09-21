import type {
  AdaptWeekInput,
  AdaptWeekOutput,
  FeedbackAnalysisOutput,
  PerformanceReportOutput,
  ProgramGenerationInput,
  ProgramGenerationOutput,
} from "@/lib/llm/schemas";

export const programInput: ProgramGenerationInput = {
  userId: "user-1",
  sports: ["run", "ride"],
  durationWeeks: 4,
  availableSlots: [{ weekday: 1 }, { weekday: 3 }, { weekday: 5 }],
  goal: { type: "generic", description: "Migliorare la base aerobica" },
  weeklyTssBudget: 300,
  currentMetrics: { ctl: 40, atl: 35, tsb: 5 },
  aggregatedHistory: { weeklySummaries: [] },
};

export const validProgram: ProgramGenerationOutput = {
  name: "Base aerobica",
  summary: "Piano bilanciato corsa e bici",
  weeks: [
    {
      weekNumber: 1,
      weekLoadTarget: 300,
      focus: "base",
      workouts: [
        {
          dayOfWeek: 1,
          sport: "run",
          name: "Fondo",
          durationMin: 45,
          tss: 100,
          blocks: [
            { type: "warm-up", durationMin: 10, description: "Jog" },
            { type: "main-set", durationMin: 25, description: "Zona 2" },
            { type: "cool-down", durationMin: 10, description: "Camminata" },
          ],
        },
        {
          dayOfWeek: 3,
          sport: "ride",
          name: "Endurance",
          durationMin: 60,
          tss: 120,
          blocks: [
            {
              type: "warm-up",
              durationMin: 10,
              description: "Spinning facile",
            },
            { type: "main-set", durationMin: 40, description: "Zona 2" },
            { type: "cool-down", durationMin: 10, description: "Agi" },
          ],
        },
      ],
    },
  ],
};

export const validFeedback: FeedbackAnalysisOutput = {
  perceivedExertion: 7,
  externalFactors: ["sleep"],
  factorNotes: "Poche ore di sonno",
  planDeviation: "minor",
  deviationSummary: "FC più alta del previsto",
  suggestedAction: "none",
};

export const validPerformance: PerformanceReportOutput = {
  summary: "Periodo solido",
  strengths: ["CTL in crescita"],
  improvements: ["TSB ancora negativo"],
  suggestions: ["Mantieni un giorno di riposo extra"],
};

export const adaptWeekInput: AdaptWeekInput = {
  userId: "user-1",
  situationText: "Ieri trekking, lunedì non posso fare il tempo.",
  situationTags: ["extra_load"],
  remainingWorkouts: [
    {
      id: "w-key",
      weekId: "week-1",
      sport: "run",
      name: "Tempo",
      plannedDate: "2026-09-08",
      dayOfWeek: 2,
      durationMin: 50,
      tss: 90,
      status: "planned",
      isKeySession: true,
      blocks: [
        { type: "warm-up", durationMin: 10, description: "Jog" },
        { type: "main-set", durationMin: 30, description: "Tempo" },
        { type: "cool-down", durationMin: 10, description: "Walk" },
      ],
    },
  ],
  completedThisWeek: [],
  extraActivities: [],
  currentMetrics: { tsb: -12 },
  weekLoadTarget: 300,
  remainingTss: 90,
  availableRemainingSlots: [{ weekday: 2 }, { weekday: 4 }],
  sportsIncluded: ["run"],
  keyWorkoutId: "w-key",
};

export const validAdaptWeek: AdaptWeekOutput = {
  rationale: "Lunedì diventa recupero, qualità spostata.",
  strategy: "postpone_quality",
  workouts: [
    {
      workoutId: "w-key",
      op: "retype",
      name: "Recupero · Tempo",
      durationMin: 35,
      tss: 50,
    },
  ],
};

export function chatApiBody(content: string, model = "deepseek-chat") {
  return {
    model,
    choices: [{ message: { content } }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
