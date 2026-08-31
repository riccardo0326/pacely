import type {
  ProgramGenerationInput,
  ProgramGenerationOutput,
} from "@/lib/llm/schemas";
import {
  forbiddenTermsFromConstraints,
  textContainsForbidden,
  WEEKDAY_NAMES,
} from "@/lib/programs/constraints";

export type GenerationIssue = {
  code:
    | "week_count"
    | "missing_week"
    | "missing_slot"
    | "extra_day"
    | "time_mismatch"
    | "invalid_sport"
    | "forbidden_term";
  message: string;
};

export function validateGeneratedProgram(
  input: ProgramGenerationInput,
  generated: ProgramGenerationOutput,
): GenerationIssue[] {
  const issues: GenerationIssue[] = [];
  if (generated.weeks.length !== input.durationWeeks) {
    issues.push({
      code: "week_count",
      message: `Attese ${input.durationWeeks} settimane, ricevute ${generated.weeks.length}`,
    });
  }

  const weekNumbers = new Set(generated.weeks.map((week) => week.weekNumber));
  for (let weekNumber = 1; weekNumber <= input.durationWeeks; weekNumber += 1) {
    if (!weekNumbers.has(weekNumber)) {
      issues.push({
        code: "missing_week",
        message: `Manca la settimana ${weekNumber}`,
      });
    }
  }

  for (const week of generated.weeks) {
    for (const slot of input.availableSlots) {
      const matches = week.workouts.filter(
        (workout) => workout.dayOfWeek === slot.weekday,
      );
      if (matches.length === 0) {
        issues.push({
          code: "missing_slot",
          message: `Settimana ${week.weekNumber}: manca ${WEEKDAY_NAMES[slot.weekday]}`,
        });
      }
      if (slot.timeOfDay) {
        for (const workout of matches) {
          if (workout.timeOfDay !== slot.timeOfDay) {
            issues.push({
              code: "time_mismatch",
              message: `Settimana ${week.weekNumber}: orario ${workout.timeOfDay ?? "vuoto"} invece di ${slot.timeOfDay}`,
            });
          }
        }
      }
    }
    for (const workout of week.workouts) {
      const allowedDay = input.availableSlots.some(
        (slot) => slot.weekday === workout.dayOfWeek,
      );
      if (!allowedDay) {
        issues.push({
          code: "extra_day",
          message: `Settimana ${week.weekNumber}: giorno non disponibile ${WEEKDAY_NAMES[workout.dayOfWeek]}`,
        });
      }
      if (!input.sports.includes(workout.sport)) {
        issues.push({
          code: "invalid_sport",
          message: `Sport non richiesto: ${workout.sport}`,
        });
      }
    }
  }

  const terms = forbiddenTermsFromConstraints(input.constraints);
  if (terms.length > 0) {
    const blob = [
      generated.name,
      generated.summary,
      ...generated.weeks.flatMap((week) => [
        week.focus ?? "",
        ...week.workouts.flatMap((workout) => [
          workout.name,
          ...workout.blocks.map((block) => block.description),
        ]),
      ]),
    ].join(" ");
    if (textContainsForbidden(blob, terms)) {
      issues.push({
        code: "forbidden_term",
        message: `Il piano usa temi vietati dai vincoli (${terms.join(", ")})`,
      });
    }
  }

  return issues;
}

export function isGeneratedProgramValid(
  input: ProgramGenerationInput,
  generated: ProgramGenerationOutput,
): boolean {
  return validateGeneratedProgram(input, generated).length === 0;
}
