import { fallbackGenerateProgram } from "@/lib/llm/fallback";
import type {
  ProgramGenerationInput,
  ProgramGenerationOutput,
  Sport,
} from "@/lib/llm/schemas";
import {
  forbiddenTermsFromConstraints,
  scrubForbiddenText,
  textContainsForbidden,
} from "@/lib/programs/constraints";

function defaultName(sport: Sport): string {
  if (sport === "run") {
    return "Corsa aerobica";
  }
  if (sport === "swim") {
    return "Nuoto tecnica";
  }
  return "Uscita endurance";
}

/**
 * Forces LLM output onto the athlete's slots/sports. Keeps matching
 * workouts, fills gaps from the algorithmic fallback, scrubs forbidden terms.
 */
export function repairGeneratedProgram(
  input: ProgramGenerationInput,
  generated: ProgramGenerationOutput,
): ProgramGenerationOutput {
  const fallback = fallbackGenerateProgram(input);
  const terms = forbiddenTermsFromConstraints(input.constraints);
  const safeName = scrubForbiddenText(generated.name, terms, fallback.name);
  const safeSummary = scrubForbiddenText(
    generated.summary,
    terms,
    fallback.summary,
  );

  const weeks = fallback.weeks.map((fallbackWeek) => {
    const llmWeek = generated.weeks.find(
      (week) => week.weekNumber === fallbackWeek.weekNumber,
    );
    const usedLlm = new Set<number>();
    const workouts = fallbackWeek.workouts.map((slotWorkout) => {
      const matchIndex =
        llmWeek?.workouts.findIndex((workout, workoutIndex) => {
          if (usedLlm.has(workoutIndex)) {
            return false;
          }
          return workout.dayOfWeek === slotWorkout.dayOfWeek;
        }) ?? -1;
      const match = matchIndex >= 0 ? llmWeek?.workouts[matchIndex] : undefined;
      if (match && llmWeek) {
        usedLlm.add(matchIndex);
        const sport = input.sports.includes(match.sport)
          ? match.sport
          : slotWorkout.sport;
        return {
          ...match,
          sport,
          dayOfWeek: slotWorkout.dayOfWeek,
          timeOfDay: slotWorkout.timeOfDay ?? match.timeOfDay,
          name: sanitizeName(match.name, sport, terms),
          blocks: match.blocks.map((block, blockIndex) => ({
            ...block,
            description: scrubForbiddenText(
              block.description,
              terms,
              slotWorkout.blocks[blockIndex]?.description ?? "Lavoro aerobico",
            ),
          })),
        };
      }
      return slotWorkout;
    });

    return {
      weekNumber: fallbackWeek.weekNumber,
      weekLoadTarget: llmWeek?.weekLoadTarget ?? fallbackWeek.weekLoadTarget,
      focus: llmWeek?.focus
        ? scrubForbiddenText(llmWeek.focus, terms, fallbackWeek.focus ?? "")
        : fallbackWeek.focus,
      workouts,
    };
  });

  return {
    name: safeName,
    summary: safeSummary,
    weeks,
  };
}

function sanitizeName(name: string, sport: Sport, terms: string[]): string {
  if (textContainsForbidden(name, terms)) {
    return defaultName(sport);
  }
  return name;
}
