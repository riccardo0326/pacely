"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getLLMProvider } from "@/lib/llm";
import { LLM_INTERACTION_TYPE } from "@/lib/llm/constants";
import type { ProgramGenerationInput } from "@/lib/llm/schemas";
import { programGenerationInputSchema } from "@/lib/llm/schemas";
import {
  assertGenerateProgramQuota,
  LlmQuotaExceededError,
} from "@/lib/llm/quota";
import {
  buildAggregatedHistory,
  buildAggregatedHistoryFromSnapshots,
} from "@/lib/programs/history";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma";
import {
  buildProgramCreateData,
  type ProgramWithDetails,
} from "@/lib/programs/persist";
import { calculateWeeklyTssBudget } from "@/lib/programs/tss-budget";
import {
  createProgramFormSchema,
  updateWorkoutFormSchema,
  type CreateProgramForm,
} from "@/lib/validation/program";
import { tryMatchUserWorkouts } from "@/server/jobs/match-workouts";

export type ProgramListItem = {
  id: string;
  name: string;
  status: string;
  sportsIncluded: string[];
  durationWeeks: number;
  startDate: string;
  createdAt: string;
};

export type ProgramDetail = {
  id: string;
  name: string;
  status: string;
  sportsIncluded: string[];
  durationWeeks: number;
  startDate: string;
  constraints: string | null;
  summary: string | null;
  goal: {
    type: string;
    description: string;
    raceType: string | null;
    distance: string | null;
    targetDate: string | null;
  } | null;
  weeks: Array<{
    id: string;
    number: number;
    weekLoadTarget: number;
    focus: string | null;
    workouts: Array<{
      id: string;
      sport: string;
      plannedDate: string;
      dayOfWeek: number;
      name: string;
      durationMin: number;
      tss: number;
      timeOfDay: string | null;
      blocks: unknown;
      status: string;
    }>;
  }>;
};

export type GenerateProgramResult =
  | { ok: true; programId: string; usedFallback: boolean }
  | { ok: false; error: string };

function serializeProgram(program: ProgramWithDetails): ProgramDetail {
  return {
    id: program.id,
    name: program.name,
    status: program.status,
    sportsIncluded: program.sportsIncluded,
    durationWeeks: program.durationWeeks,
    startDate: program.startDate.toISOString(),
    constraints: program.constraints,
    summary: program.summary,
    goal: program.goal
      ? {
          type: program.goal.type,
          description: program.goal.description,
          raceType: program.goal.raceType,
          distance: program.goal.distance,
          targetDate: program.goal.targetDate?.toISOString() ?? null,
        }
      : null,
    weeks: program.weeks.map((week) => ({
      id: week.id,
      number: week.number,
      weekLoadTarget: week.weekLoadTarget,
      focus: week.focus,
      workouts: week.workouts.map((workout) => ({
        id: workout.id,
        sport: workout.sport,
        plannedDate: workout.plannedDate.toISOString(),
        dayOfWeek: workout.dayOfWeek,
        name: workout.name,
        durationMin: workout.durationMin,
        tss: workout.tss,
        timeOfDay: workout.timeOfDay,
        blocks: workout.blocks,
        status: workout.status,
      })),
    })),
  };
}

async function loadProgramForUser(
  programId: string,
  userId: string,
): Promise<ProgramWithDetails | null> {
  return prisma.program.findFirst({
    where: { id: programId, userId },
    include: {
      goal: true,
      weeks: {
        orderBy: { number: "asc" },
        include: {
          workouts: { orderBy: { plannedDate: "asc" } },
        },
      },
    },
  });
}

async function buildGenerationInput(
  userId: string,
  form: CreateProgramForm,
): Promise<ProgramGenerationInput> {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setUTCDate(eightWeeksAgo.getUTCDate() - 56);

  const [activities, latestSnapshot, snapshots] = await Promise.all([
    prisma.activity.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 200,
      select: { sport: true, durationSec: true, startedAt: true },
    }),
    prisma.performanceMetricSnapshot.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: {
        ctl: true,
        atl: true,
        tsb: true,
        ftp: true,
        vdot: true,
        swimThresholdPaceSecPer100m: true,
      },
    }),
    prisma.performanceMetricSnapshot.findMany({
      where: { userId, date: { gte: eightWeeksAgo } },
      orderBy: { date: "asc" },
      select: { date: true, sportBreakdown: true },
    }),
  ]);

  const weeklyTssBudget = calculateWeeklyTssBudget({
    ctl: latestSnapshot?.ctl,
    atl: latestSnapshot?.atl,
    activities: activities.map((activity) => ({
      sport: activity.sport as "run" | "swim" | "ride",
      durationSec: activity.durationSec,
      startedAt: activity.startedAt,
    })),
  });

  const snapshotHistory = buildAggregatedHistoryFromSnapshots(snapshots);
  const aggregatedHistory =
    snapshotHistory.weeklySummaries.length > 0
      ? snapshotHistory
      : buildAggregatedHistory(
          activities.map((activity) => ({
            sport: activity.sport as "run" | "swim" | "ride",
            durationSec: activity.durationSec,
            startedAt: activity.startedAt,
          })),
        );

  const input: ProgramGenerationInput = {
    userId,
    sports: form.sports,
    durationWeeks: form.durationWeeks,
    availableSlots: form.slots.map((slot) => ({
      weekday: slot.weekday,
      timeOfDay: slot.timeOfDay || undefined,
    })),
    goal: {
      type: form.goalType,
      description: form.goalDescription.trim(),
      raceType: form.raceType?.trim() || undefined,
      distance: form.raceDistance?.trim() || undefined,
      date: form.raceDate || undefined,
    },
    constraints: form.constraints?.trim() || undefined,
    weeklyTssBudget,
    currentMetrics: {
      ctl: latestSnapshot?.ctl,
      atl: latestSnapshot?.atl,
      tsb: latestSnapshot?.tsb,
      ftp: latestSnapshot?.ftp ?? undefined,
      vdot: latestSnapshot?.vdot ?? undefined,
      swimThresholdPaceSecPer100m:
        latestSnapshot?.swimThresholdPaceSecPer100m ?? undefined,
    },
    aggregatedHistory,
  };

  return programGenerationInputSchema.parse(input);
}

async function persistGeneratedProgram(
  userId: string,
  form: CreateProgramForm,
  generated: Awaited<
    ReturnType<ReturnType<typeof getLLMProvider>["generateProgram"]>
  >,
): Promise<string> {
  const { program, weeks } = buildProgramCreateData(
    userId,
    form,
    generated.data,
  );

  const created = await prisma.$transaction(async (tx) => {
    const savedProgram = await tx.program.create({
      data: program,
    });

    for (const weekData of weeks) {
      await tx.week.create({
        data: {
          ...weekData.week,
          programId: savedProgram.id,
          workouts: {
            create: weekData.workouts,
          },
        },
      });
    }

    return savedProgram;
  });

  await tryMatchUserWorkouts(userId);
  return created.id;
}

export async function listPrograms(): Promise<ProgramListItem[]> {
  const user = await requireUser();
  const programs = await prisma.program.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      sportsIncluded: true,
      durationWeeks: true,
      startDate: true,
      createdAt: true,
    },
  });

  return programs.map((program) => ({
    id: program.id,
    name: program.name,
    status: program.status,
    sportsIncluded: program.sportsIncluded,
    durationWeeks: program.durationWeeks,
    startDate: program.startDate.toISOString(),
    createdAt: program.createdAt.toISOString(),
  }));
}

export async function getProgram(
  programId: string,
): Promise<ProgramDetail | null> {
  const user = await requireUser();
  const program = await loadProgramForUser(programId, user.id);
  if (!program) {
    return null;
  }
  return serializeProgram(program);
}

export async function generateProgram(
  formData: FormData,
): Promise<GenerateProgramResult> {
  const user = await requireUser();

  const raw = {
    sports: formData.getAll("sports").map(String),
    durationWeeks: formData.get("durationWeeks"),
    startDate: formData.get("startDate"),
    goalType: formData.get("goalType"),
    goalDescription: formData.get("goalDescription"),
    raceType: formData.get("raceType") || undefined,
    raceDistance: formData.get("raceDistance") || undefined,
    raceDate: formData.get("raceDate") || undefined,
    constraints: formData.get("constraints") || undefined,
    slots: parseSlotsFromForm(formData),
  };

  const parsed = createProgramFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  try {
    await assertGenerateProgramQuota(user.id);
    const input = await buildGenerationInput(user.id, parsed.data);
    const provider = getLLMProvider({
      logUsage: async (entry) => {
        await prisma.lLMInteractionLog.create({
          data: {
            userId: entry.userId,
            interactionType: entry.interactionType,
            provider: entry.provider,
            model: entry.model,
            promptTokens: entry.promptTokens,
            completionTokens: entry.completionTokens,
            totalTokens: entry.totalTokens,
            estimatedCostUsd: entry.estimatedCostUsd,
            success: entry.success,
            usedFallback: entry.usedFallback,
            error: entry.error,
          },
        });
      },
    });

    const result = await provider.generateProgram(input);
    const programId = await persistGeneratedProgram(
      user.id,
      parsed.data,
      result,
    );

    revalidatePath(routes.programs);
    revalidatePath(routes.program(programId));
    revalidatePath(routes.calendar);
    return { ok: true, programId, usedFallback: result.usedFallback };
  } catch (error) {
    if (error instanceof LlmQuotaExceededError) {
      return { ok: false, error: error.message };
    }
    const message =
      error instanceof Error ? error.message : "Generazione programma fallita";
    return { ok: false, error: message };
  }
}

export async function regenerateProgram(
  programId: string,
): Promise<GenerateProgramResult> {
  const user = await requireUser();
  const existing = await loadProgramForUser(programId, user.id);
  if (!existing || !existing.goal) {
    return { ok: false, error: "Programma non trovato" };
  }

  const slots = storedSlotsFromProgram(existing);
  const form: CreateProgramForm = {
    sports: existing.sportsIncluded as CreateProgramForm["sports"],
    durationWeeks: existing.durationWeeks,
    startDate: existing.startDate.toISOString().slice(0, 10),
    goalType: existing.goal.type as "race" | "generic",
    goalDescription: existing.goal.description,
    raceType: existing.goal.raceType ?? undefined,
    raceDistance: existing.goal.distance ?? undefined,
    raceDate: existing.goal.targetDate?.toISOString().slice(0, 10),
    constraints: existing.constraints ?? undefined,
    slots,
  };

  try {
    await assertGenerateProgramQuota(user.id);
    const input = await buildGenerationInput(user.id, form);
    const provider = getLLMProvider({
      logUsage: async (entry) => {
        await prisma.lLMInteractionLog.create({
          data: {
            userId: entry.userId,
            interactionType: LLM_INTERACTION_TYPE.generateProgram,
            provider: entry.provider,
            model: entry.model,
            promptTokens: entry.promptTokens,
            completionTokens: entry.completionTokens,
            totalTokens: entry.totalTokens,
            estimatedCostUsd: entry.estimatedCostUsd,
            success: entry.success,
            usedFallback: entry.usedFallback,
            error: entry.error,
          },
        });
      },
    });

    const result = await provider.generateProgram(input);

    await prisma.$transaction(async (tx) => {
      await tx.workout.deleteMany({
        where: { week: { programId: existing.id } },
      });
      await tx.week.deleteMany({ where: { programId: existing.id } });

      const { weeks } = buildProgramCreateData(user.id, form, result.data);

      await tx.program.update({
        where: { id: existing.id },
        data: {
          name: result.data.name,
          summary: result.data.summary,
        },
      });

      for (const weekData of weeks) {
        await tx.week.create({
          data: {
            ...weekData.week,
            programId: existing.id,
            workouts: { create: weekData.workouts },
          },
        });
      }
    });

    await tryMatchUserWorkouts(user.id);

    revalidatePath(routes.programs);
    revalidatePath(routes.program(programId));
    revalidatePath(routes.calendar);
    return { ok: true, programId, usedFallback: result.usedFallback };
  } catch (error) {
    if (error instanceof LlmQuotaExceededError) {
      return { ok: false, error: error.message };
    }
    const message =
      error instanceof Error ? error.message : "Rigenerazione fallita";
    return { ok: false, error: message };
  }
}

export async function updateWorkout(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();

  let blocks: unknown = [];
  try {
    blocks = JSON.parse(String(formData.get("blocks") ?? "[]"));
  } catch {
    return { ok: false, error: "Struttura dei blocchi non valida" };
  }

  const raw = {
    workoutId: formData.get("workoutId"),
    name: formData.get("name"),
    durationMin: formData.get("durationMin"),
    tss: formData.get("tss"),
    timeOfDay: formData.get("timeOfDay") || undefined,
    blocks,
  };

  const parsed = updateWorkoutFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  const workout = await prisma.workout.findFirst({
    where: {
      id: parsed.data.workoutId,
      week: { program: { userId: user.id } },
    },
    select: { id: true, week: { select: { programId: true } } },
  });

  if (!workout) {
    return { ok: false, error: "Allenamento non trovato" };
  }

  await prisma.workout.update({
    where: { id: workout.id },
    data: {
      name: parsed.data.name,
      durationMin: parsed.data.durationMin,
      tss: parsed.data.tss,
      timeOfDay: parsed.data.timeOfDay ?? null,
      blocks: parsed.data.blocks as Prisma.InputJsonValue,
    },
  });

  revalidatePath(routes.program(workout.week.programId));
  revalidatePath(routes.calendar);
  return { ok: true };
}

export async function createProgramAndRedirect(
  formData: FormData,
): Promise<void> {
  const result = await generateProgram(formData);
  if (!result.ok) {
    redirect(`${routes.programNew}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(routes.program(result.programId));
}

function parseSlotsFromForm(formData: FormData) {
  const weekdays = formData.getAll("slotWeekday").map((value) => Number(value));
  const times = formData.getAll("slotTime").map((value) => String(value));
  return weekdays.map((weekday, index) => ({
    weekday,
    timeOfDay: times[index] || undefined,
  }));
}

function storedSlotsFromProgram(
  program: ProgramWithDetails,
): CreateProgramForm["slots"] {
  const parsed = program.availableSlots;
  if (!Array.isArray(parsed)) {
    return [{ weekday: 1 }];
  }
  return parsed.map((slot) => {
    const row = slot as { weekday?: number; timeOfDay?: string };
    return {
      weekday: row.weekday ?? 1,
      timeOfDay: row.timeOfDay,
    };
  });
}
