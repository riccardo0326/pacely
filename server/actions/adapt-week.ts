"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import {
  EXTRA_LOAD_LOOKBACK_HOURS,
  RECALC_SOURCE,
  RECALC_STATUS,
} from "@/lib/feedback/constants";
import {
  isNotableExtraLoad,
  pickKeyWorkoutId,
  repairAdaptWeek,
} from "@/lib/feedback/adapt-week";
import { pickAdaptableWeeks } from "@/lib/feedback/adapt-weeks";
import { SITUATION_TAG_LABEL } from "@/lib/feedback/labels";
import { USER_FACING_ERROR, toUserFacingError } from "@/lib/errors/user-facing";
import { getLLMProvider } from "@/lib/llm";
import { assertAdaptWeekQuota, LlmQuotaExceededError } from "@/lib/llm/quota";
import type { AdaptWeekInput } from "@/lib/llm/schemas";
import {
  sportSchema,
  workoutBlockSchema,
  type WorkoutBlock,
} from "@/lib/llm/schemas";
import { activityTssFromRow, thresholdsFromSnapshot } from "@/lib/calendar/tss";
import { utcDateKey, utcToday } from "@/lib/metrics/dates";
import { WORKOUT_STATUS } from "@/lib/matching/constants";
import { notifyRecalcProposal } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { routes } from "@/lib/routes";
import { storedAvailableSlotsSchema } from "@/lib/validation/program";
import { requestWeekAdaptFormSchema } from "@/lib/validation/feedback";
import type { SituationTag } from "@/lib/feedback/constants";

export type ExtraLoadHint = {
  name: string | null;
  sport: string;
  startedAt: string;
  durationMin: number;
  tssEstimate: number;
};

export type WeekAdaptActionResult =
  | { ok: true; proposalCreated: boolean; usedFallback: boolean }
  | { ok: false; error: string };

function parseBlocks(raw: unknown): WorkoutBlock[] {
  const parsed = workoutBlockSchema.array().safeParse(raw);
  return parsed.success ? parsed.data : [];
}

function revalidateAdaptPaths(programId: string) {
  revalidatePath(routes.calendar);
  revalidatePath(routes.program(programId));
  revalidatePath(routes.programs);
  revalidatePath(routes.dashboard);
}

export async function listRecentExtraLoad(): Promise<ExtraLoadHint[]> {
  const user = await requireUser();
  const since = new Date(
    Date.now() - EXTRA_LOAD_LOOKBACK_HOURS * 60 * 60 * 1000,
  );
  const snapshot = await prisma.performanceMetricSnapshot.findFirst({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: {
      ftp: true,
      vdot: true,
      swimThresholdPaceSecPer100m: true,
    },
  });
  const thresholds = thresholdsFromSnapshot(snapshot);
  const matched = await prisma.workout.findMany({
    where: {
      activityId: { not: null },
      week: { program: { userId: user.id } },
    },
    select: { activityId: true },
  });
  const taken = new Set(
    matched
      .map((row) => row.activityId)
      .filter((id): id is string => id !== null),
  );

  const activities = await prisma.activity.findMany({
    where: { userId: user.id, startedAt: { gte: since } },
    select: {
      id: true,
      name: true,
      sport: true,
      startedAt: true,
      durationSec: true,
      distanceM: true,
      elevationGainM: true,
      averageHeartrate: true,
      maxHeartrate: true,
      averageWatts: true,
      weightedWatts: true,
      averageSpeedMps: true,
      perceivedExertion: true,
    },
    orderBy: { startedAt: "desc" },
  });

  const hints: ExtraLoadHint[] = [];
  for (const row of activities) {
    const unmatched = !taken.has(row.id);
    const durationMin = Math.round(row.durationSec / 60);
    const tssEstimate = activityTssFromRow(row, thresholds);
    const hint = {
      name: row.name,
      sport: row.sport,
      startedAt: row.startedAt.toISOString(),
      durationMin,
      tssEstimate,
    };
    if (row.sport === "other" || (unmatched && isNotableExtraLoad(hint))) {
      hints.push(hint);
    }
  }
  return hints;
}

export async function requestWeekAdapt(
  formData: FormData,
): Promise<WeekAdaptActionResult> {
  const user = await requireUser();
  const rawTags = formData.getAll("situationTags").map(String);
  const timeCapRaw = formData.get("timeCapMin");
  const parsed = requestWeekAdaptFormSchema.safeParse({
    programId: formData.get("programId"),
    weekId: formData.get("weekId"),
    situationText: formData.get("situationText") ?? "",
    situationTags: rawTags,
    timeCapMin:
      timeCapRaw && String(timeCapRaw).trim() !== "" ? timeCapRaw : undefined,
    timeCapDate: formData.get("timeCapDate") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Descrivi la situazione o scegli un motivo.",
    };
  }

  const program = await prisma.program.findFirst({
    where: { id: parsed.data.programId, userId: user.id },
    include: {
      goal: { select: { description: true } },
      weeks: {
        include: {
          workouts: { orderBy: { plannedDate: "asc" } },
        },
        orderBy: { number: "asc" },
      },
    },
  });
  const week = program?.weeks.find((row) => row.id === parsed.data.weekId);
  if (!program || !week) {
    return { ok: false, error: "Programma o settimana non trovati" };
  }
  if (program.status !== "active") {
    return {
      ok: false,
      error: "Puoi adattare solo un programma attivo",
    };
  }

  const today = utcToday();
  const adaptable = pickAdaptableWeeks(program.weeks, today);
  if (!adaptable.some((row) => row.id === week.id)) {
    return {
      ok: false,
      error: "Puoi adattare solo la settimana corrente o la prossima",
    };
  }

  const pendingCount = await prisma.recalcProposal.count({
    where: {
      programId: program.id,
      status: RECALC_STATUS.pending,
    },
  });
  if (pendingCount > 0) {
    return {
      ok: false,
      error: "C'è già una proposta in attesa di approvazione",
    };
  }

  const remainingRows = week.workouts.filter(
    (workout) =>
      workout.status === WORKOUT_STATUS.planned &&
      utcDateKey(workout.plannedDate) >= today,
  );
  if (remainingRows.length === 0) {
    return {
      ok: false,
      error: "Non restano allenamenti pianificati in questa settimana",
    };
  }

  try {
    await assertAdaptWeekQuota(user.id);
  } catch (error) {
    if (error instanceof LlmQuotaExceededError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const slotsParsed = storedAvailableSlotsSchema.safeParse(
    program.availableSlots,
  );
  const slots = slotsParsed.success
    ? slotsParsed.data
    : remainingRows.map((workout) => ({
        weekday: workout.dayOfWeek,
      }));
  const availableRemainingSlots = slots.filter(
    (slot) =>
      remainingRows.some((workout) => workout.dayOfWeek === slot.weekday) ||
      dateForSlotIsRemaining(week.workouts, slot.weekday, today),
  );

  const remainingWorkouts = remainingRows.map((workout) =>
    toAdaptWorkout(workout, false),
  );
  const keyWorkoutId = pickKeyWorkoutId(remainingWorkouts);
  const remainingWithKey = remainingWorkouts.map((workout) => ({
    ...workout,
    isKeySession: workout.id === keyWorkoutId,
  }));

  const extraLoad = await listRecentExtraLoad();
  const snapshot = await prisma.performanceMetricSnapshot.findFirst({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { ctl: true, atl: true, tsb: true, ftp: true, vdot: true },
  });

  const tags = parsed.data.situationTags as SituationTag[];
  const situationText =
    parsed.data.situationText.length > 0
      ? parsed.data.situationText
      : tags.map((tag) => SITUATION_TAG_LABEL[tag]).join(", ");

  const sports = program.sportsIncluded
    .map((sport) => sportSchema.safeParse(sport))
    .filter((row) => row.success)
    .map((row) => row.data);

  const llmInput: AdaptWeekInput = {
    userId: user.id,
    situationText,
    situationTags: tags,
    timeCapMin: parsed.data.timeCapMin,
    timeCapDate: parsed.data.timeCapDate,
    remainingWorkouts: remainingWithKey,
    completedThisWeek: week.workouts
      .filter((workout) => workout.status === WORKOUT_STATUS.completed)
      .map((workout) => toAdaptWorkout(workout, false)),
    extraActivities: extraLoad.map((row) => ({
      name: row.name,
      sport: row.sport,
      startedAt: row.startedAt,
      durationMin: row.durationMin,
      tssEstimate: row.tssEstimate,
    })),
    currentMetrics: {
      ctl: snapshot?.ctl,
      atl: snapshot?.atl,
      tsb: snapshot?.tsb,
      ftp: snapshot?.ftp ?? undefined,
      vdot: snapshot?.vdot ?? undefined,
    },
    weekFocus: week.focus ?? undefined,
    weekLoadTarget: week.weekLoadTarget,
    remainingTss: remainingRows.reduce((sum, workout) => sum + workout.tss, 0),
    availableRemainingSlots:
      availableRemainingSlots.length > 0
        ? availableRemainingSlots
        : slots.length > 0
          ? slots
          : [{ weekday: remainingRows[0].dayOfWeek }],
    sportsIncluded: sports.length > 0 ? sports : ["run"],
    goalDescription: program.goal?.description,
    keyWorkoutId,
  };

  try {
    const provider = getLLMProvider();
    const result = await provider.adaptWeek(llmInput);
    const changes = repairAdaptWeek(llmInput, result.data);
    if (!changes) {
      return {
        ok: false,
        error:
          "Non è stato possibile adattare la settimana con questi vincoli.",
      };
    }

    const proposal = await prisma.recalcProposal.create({
      data: {
        programId: program.id,
        weekId: week.id,
        source: RECALC_SOURCE.weekAdapt,
        situationText,
        situationTags: tags,
        rationale: result.data.rationale,
        changes: changes as Prisma.InputJsonValue,
        status: RECALC_STATUS.pending,
      },
      select: { id: true },
    });

    try {
      await notifyRecalcProposal({
        userId: user.id,
        programId: program.id,
        proposalId: proposal.id,
        programName: program.name,
      });
    } catch (error) {
      console.error("week adapt notification failed", error);
    }

    revalidateAdaptPaths(program.id);
    revalidatePath(routes.notifications, "layout");
    revalidatePath("/", "layout");
    return {
      ok: true,
      proposalCreated: true,
      usedFallback: result.usedFallback,
    };
  } catch (error) {
    return {
      ok: false,
      error: toUserFacingError(error, USER_FACING_ERROR.adaptWeek),
    };
  }
}

function dateForSlotIsRemaining(
  workouts: Array<{ plannedDate: Date; dayOfWeek: number }>,
  weekday: number,
  today: string,
): boolean {
  const match = workouts.find((workout) => workout.dayOfWeek === weekday);
  if (!match) {
    return false;
  }
  return utcDateKey(match.plannedDate) >= today;
}

function toAdaptWorkout(
  workout: {
    id: string;
    weekId: string;
    sport: string;
    name: string;
    plannedDate: Date;
    dayOfWeek: number;
    durationMin: number;
    tss: number;
    status: string;
    blocks: unknown;
  },
  isKeySession: boolean,
): AdaptWeekInput["remainingWorkouts"][number] {
  const sport = sportSchema.safeParse(workout.sport);
  const status =
    workout.status === WORKOUT_STATUS.completed
      ? "completed"
      : workout.status === WORKOUT_STATUS.skipped
        ? "skipped"
        : "planned";
  return {
    id: workout.id,
    weekId: workout.weekId,
    sport: sport.success ? sport.data : "run",
    name: workout.name,
    plannedDate: utcDateKey(workout.plannedDate),
    dayOfWeek: workout.dayOfWeek,
    durationMin: workout.durationMin,
    tss: workout.tss,
    status,
    isKeySession,
    blocks: parseBlocks(workout.blocks),
  };
}
