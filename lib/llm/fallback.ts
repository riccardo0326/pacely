import type {
  FeedbackAnalysisInput,
  FeedbackAnalysisOutput,
  PerformanceAnalysisInput,
  PerformanceReportOutput,
  ProgramGenerationInput,
  ProgramGenerationOutput,
  Sport,
} from "@/lib/llm/schemas";

const SPORT_LABEL: Record<Sport, string> = {
  run: "corsa",
  swim: "nuoto",
  ride: "ciclismo",
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function weekLoadMultiplier(weekNumber: number): number {
  if (weekNumber % 4 === 0) {
    return 0.7;
  }
  return Math.min(1.15, 1 + 0.03 * (weekNumber - 1));
}

function splitLoad(total: number, parts: number): number[] {
  if (parts <= 0) {
    return [];
  }
  const base = round1(total / parts);
  const values = Array.from({ length: parts }, () => base);
  const drift = round1(total - base * parts);
  values[parts - 1] = round1(values[parts - 1] + drift);
  return values;
}

function defaultWorkoutName(sport: Sport): string {
  if (sport === "run") {
    return "Corsa aerobica";
  }
  if (sport === "swim") {
    return "Nuoto tecnica";
  }
  return "Uscita endurance";
}

function simpleBlocks(durationMin: number, sport: Sport) {
  const warm = Math.max(5, Math.round(durationMin * 0.15));
  const cool = Math.max(5, Math.round(durationMin * 0.15));
  const main = Math.max(10, durationMin - warm - cool);
  const metric: "hr" | "pace" | "power" =
    sport === "ride" ? "power" : sport === "run" ? "pace" : "hr";
  return [
    {
      type: "warm-up" as const,
      durationMin: warm,
      description: "Riscaldamento facile",
      target: { zone: 1 as const, metric, description: "Zona 1" },
    },
    {
      type: "main-set" as const,
      durationMin: main,
      description: "Lavoro principale aerobico",
      target: { zone: 2 as const, metric, description: "Zona 2-3" },
    },
    {
      type: "cool-down" as const,
      durationMin: cool,
      description: "Defaticamento",
      target: { zone: 1 as const, metric, description: "Zona 1" },
    },
  ];
}

export function fallbackGenerateProgram(
  input: ProgramGenerationInput,
): ProgramGenerationOutput {
  const sports = input.sports;
  const slots = input.availableSlots;
  const sportLabels = sports.map((sport) => SPORT_LABEL[sport]).join(", ");

  const weeks = Array.from({ length: input.durationWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const isRecovery = weekNumber % 4 === 0;
    const weekLoadTarget = round1(
      input.weeklyTssBudget * weekLoadMultiplier(weekNumber),
    );
    const loads = splitLoad(weekLoadTarget, slots.length);

    return {
      weekNumber,
      weekLoadTarget,
      focus: isRecovery ? "recupero" : "progressione",
      workouts: slots.map((slot, slotIndex) => {
        const sport = sports[slotIndex % sports.length];
        if (!sport) {
          throw new Error("Nessuno sport nel programma");
        }
        const tss = loads[slotIndex] ?? 0;
        const durationMin = Math.max(20, Math.round(tss * 0.9));
        return {
          dayOfWeek: slot.weekday,
          sport,
          name: defaultWorkoutName(sport),
          durationMin,
          tss,
          timeOfDay: slot.timeOfDay,
          blocks: simpleBlocks(durationMin, sport),
        };
      }),
    };
  });

  return {
    name: `Programma ${sportLabels}`,
    summary:
      "Programma generato con fallback algoritmico: l'LLM non ha prodotto un JSON valido. I carichi sono una progressione semplice sul budget TSS settimanale.",
    weeks,
  };
}

export function fallbackAnalyzeFeedback(
  input: FeedbackAnalysisInput,
): FeedbackAnalysisOutput {
  return {
    perceivedExertion: null,
    externalFactors: [],
    factorNotes: "Analisi LLM non disponibile.",
    planDeviation: "none",
    deviationSummary: `Il feedback è stato salvato senza estrazione automatica: "${input.freeText.slice(0, 180)}"`,
    suggestedAction: "none",
  };
}

export function fallbackAnalyzePerformance(
  input: PerformanceAnalysisInput,
): PerformanceReportOutput {
  const { metricTrends } = input;
  const strengths: string[] = [];
  const improvements: string[] = [];
  const suggestions: string[] = [];

  if ((metricTrends.ctlChange ?? 0) > 0) {
    strengths.push("Il CTL è in aumento nel periodo.");
  } else if ((metricTrends.ctlChange ?? 0) < 0) {
    improvements.push("Il CTL è in calo nel periodo.");
  }

  if ((metricTrends.ftpChange ?? 0) > 0) {
    strengths.push("L'FTP stimato è in crescita.");
  }
  if ((metricTrends.vdotChange ?? 0) > 0) {
    strengths.push("Il VDOT stimato è in crescita.");
  }
  if ((metricTrends.swimThresholdPaceChangeSec ?? 0) < 0) {
    strengths.push("Il passo soglia di nuoto è migliorato.");
  }

  if (strengths.length === 0) {
    strengths.push(
      "Analisi LLM non disponibile: i dati del periodo sono stati conservati.",
    );
  }
  if (improvements.length === 0) {
    improvements.push(
      "Nessuna area di miglioramento derivabile automaticamente senza l'LLM.",
    );
  }
  suggestions.push(
    "Riprova la generazione del report quando il provider LLM è di nuovo disponibile.",
  );

  return {
    summary: `Report fallback per il periodo ${input.periodStart} – ${input.periodEnd}. L'analisi in linguaggio naturale non è disponibile.`,
    strengths,
    improvements,
    suggestions,
  };
}
