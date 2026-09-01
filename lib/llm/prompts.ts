import type { PerformanceAnalysisInput } from "@/lib/llm/schemas";

export const PROGRAM_SYSTEM_PROMPT = `Sei un coach multi-sport (corsa, nuoto, ciclismo).
Rispondi SOLO con un oggetto JSON valido, senza markdown e senza testo extra.
Il JSON deve avere questa forma:
{
  "name": string,
  "summary": string,
  "weeks": [
    {
      "weekNumber": number,
      "weekLoadTarget": number,
      "focus": string,
      "workouts": [
        {
          "dayOfWeek": 0-6,
          "sport": "run" | "swim" | "ride",
          "name": string,
          "durationMin": number,
          "tss": number,
          "timeOfDay": string opzionale,
          "blocks": [
            {
              "type": "warm-up" | "main-set" | "cool-down",
              "durationMin": number,
              "description": string,
              "target": { "zone": 1-5, "metric": "hr" | "pace" | "power", "description": string } opzionale,
              "repetitions": number opzionale
            }
          ]
        }
      ]
    }
  ]
}
Regole HARD:
- Ogni settimana ha ESATTAMENTE un workout per ciascuno slot indicato (stesso dayOfWeek e timeOfDay). Non inventare altri giorni.
- Usa SOLO gli sport richiesti e usali TUTTI nel corso del programma.
- Rispetta il budget TSS settimanale (progressione ragionevole, scarico ogni 4 settimane).
- Ogni workout ha almeno warm-up, main-set e cool-down.
- I VINCOLI/VIETATO sono divieti: non farne il tema del piano (es. se è vietata la salita, non programmare corsa in salita).
- Non inventare metriche assenti nell'input.`;

export const WEEKDAY_PROMPT_NAMES = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
] as const;

export function buildProgramUserPrompt(input: {
  sports: Array<"run" | "swim" | "ride">;
  durationWeeks: number;
  availableSlots: Array<{ weekday: number; timeOfDay?: string }>;
  goal: {
    type: string;
    description: string;
    raceType?: string;
    distance?: string;
    date?: string;
  };
  constraints?: string;
  weeklyTssBudget: number;
  currentMetrics: unknown;
  aggregatedHistory: unknown;
  forbiddenTerms?: string[];
}): string {
  const slots = input.availableSlots
    .map((slot) => {
      const day =
        WEEKDAY_PROMPT_NAMES[slot.weekday] ?? `giorno ${slot.weekday}`;
      const time = slot.timeOfDay ? ` alle ${slot.timeOfDay}` : "";
      return `- ${day} (dayOfWeek=${slot.weekday})${time}`;
    })
    .join("\n");

  const goalBits = [
    `tipo=${input.goal.type}`,
    input.goal.description,
    input.goal.raceType ? `gara=${input.goal.raceType}` : null,
    input.goal.distance ? `distanza=${input.goal.distance}` : null,
    input.goal.date ? `data=${input.goal.date}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const forbidden =
    input.forbiddenTerms && input.forbiddenTerms.length > 0
      ? `VIETATO (divieti, NON farne l'obiettivo del piano; non usare queste parole in name/focus/description):\n- ${input.forbiddenTerms.join("\n- ")}\nVincolo originale: ${input.constraints}`
      : `VINCOLI: ${input.constraints?.trim() || "nessuno"}`;

  return [
    `SPORT OBBLIGATORI (tutti, nessun altro): ${input.sports.join(", ")}`,
    `DURATA: ${input.durationWeeks} settimane (weekNumber da 1 a ${input.durationWeeks})`,
    `BUDGET TSS SETTIMANALE TARGET: ${input.weeklyTssBudget}`,
    `OBIETTIVO: ${goalBits}`,
    `SLOT OBBLIGATORI (copia dayOfWeek e timeOfDay; una seduta per slot, ogni settimana):\n${slots}`,
    forbidden,
    `METRICHE ATLETA: ${JSON.stringify(input.currentMetrics)}`,
    `STORICO AGGREGATO: ${JSON.stringify(input.aggregatedHistory)}`,
  ].join("\n\n");
}

export const FEEDBACK_SYSTEM_PROMPT = `Analizza il feedback testuale di un atleta dopo un allenamento.
Rispondi SOLO con un oggetto JSON valido, senza markdown e senza testo extra.
Il JSON deve avere questa forma:
{
  "perceivedExertion": number 1-10 oppure null se non ricavabile,
  "externalFactors": array di "sleep" | "stress" | "illness" | "weather" | "nutrition" | "other",
  "factorNotes": string opzionale,
  "planDeviation": "none" | "minor" | "significant",
  "deviationSummary": string,
  "suggestedAction": "none" | "reduce_load" | "shift_rest_day" | "extend_recovery"
}
Non inventare un RPE se il testo non lo implica. Non inventare fattori esterni non menzionati.`;

export const PERFORMANCE_SYSTEM_PROMPT = `Scrivi un report di performance informativo (non modificare il piano).
Rispondi SOLO con un oggetto JSON valido, senza markdown e senza testo extra.
Il JSON deve avere questa forma:
{
  "summary": string,
  "strengths": string[] (almeno 1),
  "improvements": string[] (almeno 1),
  "suggestions": string[] (almeno 1)
}
Basa il testo sui trend metriche e sui feedback forniti. Non inventare dati assenti.
CTL = carico cronico (fitness): un aumento è generalmente positivo.
ATL = carico acuto (fatica recente): un aumento indica più sforzo recente, non un miglioramento della forma.
TSB = forma (CTL − ATL): un TSB in calo significa più fatica, non un miglioramento. Non chiamare «miglioramento» una diminuzione del TSB.
Un delta negativo sul passo soglia nuoto è un miglioramento (passo più veloce). Non proporre modifiche automatiche al piano.`;

export function buildPerformanceUserPrompt(
  input: PerformanceAnalysisInput,
): string {
  const trendBits = Object.entries(input.metricTrends)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
  const feedback =
    input.feedbackSummaries.length === 0
      ? "nessun feedback nel periodo"
      : input.feedbackSummaries
          .map((line, index) => `${index + 1}. ${line}`)
          .join("\n");

  return [
    `PERIODO: ${input.periodStart} – ${input.periodEnd}`,
    `TREND METRICHE (delta nel periodo): ${trendBits || "nessun trend numerico"}`,
    `FEEDBACK RACCOLTI:\n${feedback}`,
  ].join("\n\n");
}
