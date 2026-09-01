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
      "Bozza di programma: i carichi seguono una progressione semplice. Puoi modificarla o rigenerarla.",
    weeks,
  };
}

export function fallbackAnalyzeFeedback(
  input: FeedbackAnalysisInput,
): FeedbackAnalysisOutput {
  return {
    perceivedExertion: null,
    externalFactors: [],
    factorNotes: "Analisi automatica non disponibile.",
    planDeviation: "none",
    deviationSummary: `Il feedback è stato salvato senza estrazione automatica: "${input.freeText.slice(0, 180)}"`,
    suggestedAction: "none",
  };
}

export function fallbackAnalyzePerformance(
  input: PerformanceAnalysisInput,
): PerformanceReportOutput {
  const { metricTrends } = input;
  const ctl = metricTrends.ctlChange ?? 0;
  const atl = metricTrends.atlChange ?? 0;
  const tsb = metricTrends.tsbChange ?? 0;
  const strengths: string[] = [];
  const improvements: string[] = [];
  const suggestions: string[] = [];

  if (ctl > 0) {
    strengths.push(
      "La base di forma (CTL, il carico cronico) è cresciuta: stai costruendo condizione.",
    );
  } else if (ctl < 0) {
    improvements.push(
      "La base di forma (CTL) è scesa: in questo periodo ti sei scaricato più di quanto hai costruito.",
    );
  }

  if (atl > 0) {
    improvements.push(
      "Il carico acuto (ATL, la fatica recente) è salito: hai lavorato di più, non è un miglioramento della forma.",
    );
  } else if (atl < 0) {
    strengths.push(
      "Il carico acuto (ATL) è sceso: nelle ultime sessioni ti sei dato più recupero.",
    );
  }

  if (tsb > 0) {
    strengths.push(
      "La forma (TSB) è salita: sei più fresco rispetto al carico di base.",
    );
  } else if (tsb < 0) {
    improvements.push(
      "La forma (TSB) è scesa: più fatica recente, non un miglioramento.",
    );
  }

  if ((metricTrends.ftpChange ?? 0) > 0) {
    strengths.push("L'FTP stimato in bici è in crescita.");
  }
  if ((metricTrends.vdotChange ?? 0) > 0) {
    strengths.push("Il VDOT stimato in corsa è in crescita.");
  }
  if ((metricTrends.swimThresholdPaceChangeSec ?? 0) < 0) {
    strengths.push("Il passo soglia di nuoto è migliorato (più veloce).");
  }

  if (strengths.length === 0) {
    strengths.push("I dati del periodo sono stati conservati.");
  }
  if (improvements.length === 0) {
    improvements.push(
      "Dai numeri non emerge un'area di attenzione evidente: continua a osservare come rispondi al carico.",
    );
  }
  suggestions.push(
    "Tieni d'occhio il rapporto tra fatica recente e recupero: se l'ATL resta alto, inserisci un giorno più facile prima di spingere di nuovo.",
  );

  const style = input.style ?? "simple";
  const summary =
    style === "technical"
      ? `Dal ${input.periodStart} al ${input.periodEnd}, CTL ${signed(ctl)}, ATL ${signed(atl)}, TSB ${signed(tsb)}. Un ATL in salita e un TSB in calo indicano più fatica recente, non una forma migliore.`
      : [
          `Guardando il periodo dal ${input.periodStart} al ${input.periodEnd}, il quadro è questo: ${ctlSentence(ctl)} ${atlSentence(atl)}`,
          tsbSentence(tsb),
        ].join("\n\n");

  return {
    summary,
    strengths,
    improvements,
    suggestions,
    style,
  };
}

function signed(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) {
    return `+${rounded}`;
  }
  return String(rounded);
}

function ctlSentence(ctl: number): string {
  if (ctl > 0) {
    return "la base di forma è cresciuta un po'.";
  }
  if (ctl < 0) {
    return "la base di forma si è alleggerita.";
  }
  return "la base di forma è rimasta sostanzialmente stabile.";
}

function atlSentence(atl: number): string {
  if (atl > 0) {
    return "Hai faticato di più nelle sessioni recenti.";
  }
  if (atl < 0) {
    return "Nelle ultime sessioni il carico è stato più leggero.";
  }
  return "Il carico delle ultime sessioni è rimasto simile a prima.";
}

function tsbSentence(tsb: number): string {
  if (tsb > 0) {
    return "Di conseguenza sei arrivato più fresco: la forma è migliorata perché hai recuperato rispetto al carico di base.";
  }
  if (tsb < 0) {
    return "Di conseguenza sei un po' più stanco: la forma è scesa perché la fatica recente pesa più del carico di base. Non è un passo avanti, è solo più accumulo.";
  }
  return "La forma è restata in equilibrio tra carico e recupero.";
}
