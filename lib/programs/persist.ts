import type { Prisma } from "@prisma/client";
import type { ProgramGenerationOutput, Sport } from "@/lib/llm/schemas";
import { plannedDateForWorkout } from "@/lib/programs/dates";
import type { CreateProgramForm } from "@/lib/validation/program";
import { storedAvailableSlotsSchema } from "@/lib/validation/program";

export type ProgramWithDetails = Prisma.ProgramGetPayload<{
  include: {
    goal: true;
    weeks: {
      orderBy: { number: "asc" };
      include: {
        workouts: { orderBy: { plannedDate: "asc" } };
      };
    };
  };
}>;

export function formToAvailableSlots(form: CreateProgramForm) {
  return storedAvailableSlotsSchema.parse(
    form.slots.map((slot) => ({
      weekday: slot.weekday,
      timeOfDay: slot.timeOfDay || undefined,
    })),
  );
}

export function buildProgramCreateData(
  userId: string,
  form: CreateProgramForm,
  generated: ProgramGenerationOutput,
): {
  program: Prisma.ProgramCreateInput;
  weeks: Array<{
    week: Omit<Prisma.WeekCreateWithoutProgramInput, "workouts">;
    workouts: Prisma.WorkoutCreateWithoutWeekInput[];
  }>;
} {
  const startDate = new Date(form.startDate);
  const availableSlots = formToAvailableSlots(form);

  const program: Prisma.ProgramCreateInput = {
    user: { connect: { id: userId } },
    name: generated.name,
    sportsIncluded: form.sports,
    durationWeeks: form.durationWeeks,
    status: "active",
    startDate,
    constraints: form.constraints?.trim() || null,
    availableSlots: availableSlots as Prisma.InputJsonValue,
    summary: generated.summary,
    goal: {
      create: {
        type: form.goalType,
        description: form.goalDescription.trim(),
        raceType: form.raceType?.trim() || null,
        distance: form.raceDistance?.trim() || null,
        targetDate: form.raceDate ? new Date(form.raceDate) : null,
      },
    },
  };

  const weeks = generated.weeks.map((week) => ({
    week: {
      number: week.weekNumber,
      weekLoadTarget: week.weekLoadTarget,
      focus: week.focus ?? null,
    },
    workouts: week.workouts.map((workout) => ({
      sport: workout.sport,
      plannedDate: plannedDateForWorkout(
        startDate,
        week.weekNumber,
        workout.dayOfWeek,
      ),
      dayOfWeek: workout.dayOfWeek,
      name: workout.name,
      durationMin: Math.round(workout.durationMin),
      tss: workout.tss,
      timeOfDay: workout.timeOfDay ?? null,
      blocks: workout.blocks as Prisma.InputJsonValue,
      status: "planned",
    })),
  }));

  return { program, weeks };
}

export function summarizeSportBalance(
  generated: ProgramGenerationOutput,
): Record<Sport, number> {
  const totals: Record<Sport, number> = { run: 0, swim: 0, ride: 0 };
  for (const week of generated.weeks) {
    for (const workout of week.workouts) {
      totals[workout.sport] += workout.tss;
    }
  }
  return totals;
}

export function sportBalanceRatio(
  totals: Record<Sport, number>,
  sports: Sport[],
): number | null {
  const active = sports
    .map((sport) => totals[sport])
    .filter((value) => value > 0);
  if (active.length <= 1) {
    return null;
  }
  return Math.max(...active) / Math.min(...active);
}
