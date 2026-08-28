import type {
  FeedbackAnalysisOutput,
  PerformanceReportOutput,
  ProgramGenerationInput,
  ProgramGenerationOutput,
} from "@/lib/llm/schemas";

export const programInput: ProgramGenerationInput = {
  userId: "user-1",
  sports: ["run", "ride"],
  durationWeeks: 4,
  availableSlots: [
    { weekday: 1, timeOfDay: "07:00" },
    { weekday: 3 },
    { weekday: 5 },
  ],
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
