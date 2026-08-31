"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import {
  summarizePlannedVsActual,
  type PlannedActualTotals,
} from "@/lib/calendar/compare";
import {
  calendarRange,
  enumerateUtcDates,
  parseCalendarView,
  parseFocusDate,
  type CalendarView,
} from "@/lib/calendar/range";
import { activityTssFromRow, thresholdsFromSnapshot } from "@/lib/calendar/tss";
import { utcDateKey, utcToday } from "@/lib/metrics/dates";
import { MATCH_SOURCE, WORKOUT_STATUS } from "@/lib/matching/constants";
import { prisma } from "@/lib/prisma";
import { routes } from "@/lib/routes";
import {
  matchWorkoutFormSchema,
  workoutIdFormSchema,
} from "@/lib/validation/calendar";
import { tryMatchUserWorkouts } from "@/server/jobs/match-workouts";

const ACTIVITY_SELECT = {
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
} as const;

type ActivityRow = {
  id: string;
  name: string | null;
  sport: string;
  startedAt: Date;
  durationSec: number;
  distanceM: number | null;
  elevationGainM: number | null;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  averageWatts: number | null;
  weightedWatts: number | null;
  averageSpeedMps: number | null;
  perceivedExertion: number | null;
};

export type CalendarActivityCard = {
  id: string;
  name: string | null;
  sport: string;
  startedAt: string;
  durationSec: number;
  durationMin: number;
  distanceM: number | null;
  averageHeartrate: number | null;
  tss: number;
};

export type CalendarWorkoutCard = {
  id: string;
  name: string;
  sport: string;
  status: string;
  matchSource: string | null;
  plannedDate: string;
  durationMin: number;
  tss: number;
  timeOfDay: string | null;
  programId: string;
  programName: string;
  activity: CalendarActivityCard | null;
  candidates: CalendarActivityCard[];
};

export type CalendarDay = {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  workouts: CalendarWorkoutCard[];
  unplannedActivities: CalendarActivityCard[];
};

export type CalendarData = {
  view: CalendarView;
  focus: string;
  rangeStart: string;
  rangeEnd: string;
  monthKey: string;
  days: CalendarDay[];
  totals: PlannedActualTotals;
};

export type CalendarActionResult = { ok: true } | { ok: false; error: string };

function toActivityCard(
  row: ActivityRow,
  thresholds: ReturnType<typeof thresholdsFromSnapshot>,
): CalendarActivityCard {
  return {
    id: row.id,
    name: row.name,
    sport: row.sport,
    startedAt: row.startedAt.toISOString(),
    durationSec: row.durationSec,
    durationMin: Math.round(row.durationSec / 60),
    distanceM: row.distanceM,
    averageHeartrate: row.averageHeartrate,
    tss: Math.round(activityTssFromRow(row, thresholds) * 10) / 10,
  };
}

function revalidateCalendar(programId?: string) {
  revalidatePath(routes.calendar);
  if (programId) {
    revalidatePath(routes.program(programId));
  }
}

async function loadOwnedWorkout(userId: string, workoutId: string) {
  return prisma.workout.findFirst({
    where: { id: workoutId, week: { program: { userId } } },
    select: {
      id: true,
      activityId: true,
      week: { select: { programId: true } },
    },
  });
}

export async function getCalendarData(
  viewParam?: string,
  dateParam?: string,
): Promise<CalendarData> {
  const user = await requireUser();
  const userId = user.id;
  await tryMatchUserWorkouts(userId);

  const view = parseCalendarView(viewParam);
  const focus = parseFocusDate(dateParam);
  const range = calendarRange(view, focus);
  const today = utcToday();
  const monthKey = utcDateKey(focus).slice(0, 7);

  const [workouts, activities, snapshot] = await Promise.all([
    prisma.workout.findMany({
      where: {
        plannedDate: { gte: range.start, lt: range.end },
        week: { program: { userId, status: "active" } },
      },
      include: {
        activity: { select: ACTIVITY_SELECT },
        week: {
          select: {
            program: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ plannedDate: "asc" }, { timeOfDay: "asc" }],
    }),
    prisma.activity.findMany({
      where: {
        userId,
        startedAt: { gte: range.start, lt: range.end },
      },
      select: ACTIVITY_SELECT,
      orderBy: { startedAt: "asc" },
    }),
    prisma.performanceMetricSnapshot.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: {
        ftp: true,
        vdot: true,
        swimThresholdPaceSecPer100m: true,
      },
    }),
  ]);

  const thresholds = thresholdsFromSnapshot(snapshot);
  const activityCards = new Map<string, CalendarActivityCard>();
  for (const row of activities) {
    activityCards.set(row.id, toActivityCard(row, thresholds));
  }

  const linkedIds = new Set(
    workouts
      .map((workout) => workout.activityId)
      .filter((id): id is string => id !== null),
  );

  const unmatchedByDaySport = new Map<string, CalendarActivityCard[]>();
  for (const row of activities) {
    if (linkedIds.has(row.id)) {
      continue;
    }
    const card = activityCards.get(row.id);
    if (!card) {
      continue;
    }
    const key = `${utcDateKey(row.startedAt)}:${row.sport}`;
    const list = unmatchedByDaySport.get(key) ?? [];
    list.push(card);
    unmatchedByDaySport.set(key, list);
  }

  const workoutsByDay = new Map<string, CalendarWorkoutCard[]>();
  for (const workout of workouts) {
    const dateKey = utcDateKey(workout.plannedDate);
    const activity = workout.activity
      ? toActivityCard(workout.activity, thresholds)
      : null;
    const candidates = [
      ...(unmatchedByDaySport.get(`${dateKey}:${workout.sport}`) ?? []),
    ];
    const card: CalendarWorkoutCard = {
      id: workout.id,
      name: workout.name,
      sport: workout.sport,
      status: workout.status,
      matchSource: workout.matchSource,
      plannedDate: dateKey,
      durationMin: workout.durationMin,
      tss: workout.tss,
      timeOfDay: workout.timeOfDay,
      programId: workout.week.program.id,
      programName: workout.week.program.name,
      activity,
      candidates,
    };
    const list = workoutsByDay.get(dateKey) ?? [];
    list.push(card);
    workoutsByDay.set(dateKey, list);
  }

  const dates = enumerateUtcDates(range.startKey, range.endKey);
  const days: CalendarDay[] = dates.map((date) => {
    const dayWorkouts = workoutsByDay.get(date) ?? [];
    const linkedOnDay = new Set(
      dayWorkouts
        .map((workout) => workout.activity?.id)
        .filter((id): id is string => Boolean(id)),
    );
    const unplannedActivities = activities
      .filter(
        (row) => utcDateKey(row.startedAt) === date && !linkedOnDay.has(row.id),
      )
      .map((row) => activityCards.get(row.id))
      .filter((card): card is CalendarActivityCard => Boolean(card));

    return {
      date,
      inMonth: date.startsWith(monthKey),
      isToday: date === today,
      workouts: dayWorkouts,
      unplannedActivities,
    };
  });

  const totals = summarizePlannedVsActual(
    days.flatMap((day) =>
      view === "month" && !day.inMonth
        ? []
        : day.workouts.map((workout) => ({
            status: workout.status,
            plannedTss: workout.tss,
            plannedDurationMin: workout.durationMin,
            actualTss: workout.activity?.tss ?? null,
            actualDurationMin: workout.activity?.durationMin ?? null,
          })),
    ),
  );

  return {
    view,
    focus: utcDateKey(focus),
    rangeStart: range.startKey,
    rangeEnd: range.endKey,
    monthKey,
    days,
    totals,
  };
}

export async function linkWorkoutActivity(
  formData: FormData,
): Promise<CalendarActionResult> {
  const user = await requireUser();
  const parsed = matchWorkoutFormSchema.safeParse({
    workoutId: formData.get("workoutId"),
    activityId: formData.get("activityId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Dati di abbinamento non validi" };
  }

  const workout = await loadOwnedWorkout(user.id, parsed.data.workoutId);
  if (!workout) {
    return { ok: false, error: "Allenamento non trovato" };
  }

  const activity = await prisma.activity.findFirst({
    where: { id: parsed.data.activityId, userId: user.id },
    select: { id: true },
  });
  if (!activity) {
    return { ok: false, error: "Attività non trovata" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.workout.updateMany({
      where: {
        activityId: activity.id,
        id: { not: workout.id },
        week: { program: { userId: user.id } },
      },
      data: {
        activityId: null,
        status: WORKOUT_STATUS.planned,
        matchSource: MATCH_SOURCE.manual,
      },
    });
    await tx.workout.update({
      where: { id: workout.id },
      data: {
        activityId: activity.id,
        status: WORKOUT_STATUS.completed,
        matchSource: MATCH_SOURCE.manual,
      },
    });
  });

  revalidateCalendar(workout.week.programId);
  return { ok: true };
}

export async function unlinkWorkoutActivity(
  formData: FormData,
): Promise<CalendarActionResult> {
  const user = await requireUser();
  const parsed = workoutIdFormSchema.safeParse({
    workoutId: formData.get("workoutId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Allenamento non valido" };
  }

  const workout = await loadOwnedWorkout(user.id, parsed.data.workoutId);
  if (!workout) {
    return { ok: false, error: "Allenamento non trovato" };
  }

  await prisma.workout.update({
    where: { id: workout.id },
    data: {
      activityId: null,
      status: WORKOUT_STATUS.planned,
      matchSource: MATCH_SOURCE.manual,
    },
  });

  revalidateCalendar(workout.week.programId);
  return { ok: true };
}

export async function skipWorkout(
  formData: FormData,
): Promise<CalendarActionResult> {
  const user = await requireUser();
  const parsed = workoutIdFormSchema.safeParse({
    workoutId: formData.get("workoutId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Allenamento non valido" };
  }

  const workout = await loadOwnedWorkout(user.id, parsed.data.workoutId);
  if (!workout) {
    return { ok: false, error: "Allenamento non trovato" };
  }

  await prisma.workout.update({
    where: { id: workout.id },
    data: {
      activityId: null,
      status: WORKOUT_STATUS.skipped,
      matchSource: MATCH_SOURCE.manual,
    },
  });

  revalidateCalendar(workout.week.programId);
  return { ok: true };
}

export async function unskipWorkout(
  formData: FormData,
): Promise<CalendarActionResult> {
  const user = await requireUser();
  const parsed = workoutIdFormSchema.safeParse({
    workoutId: formData.get("workoutId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Allenamento non valido" };
  }

  const workout = await loadOwnedWorkout(user.id, parsed.data.workoutId);
  if (!workout) {
    return { ok: false, error: "Allenamento non trovato" };
  }

  await prisma.workout.update({
    where: { id: workout.id },
    data: {
      activityId: null,
      status: WORKOUT_STATUS.planned,
      matchSource: MATCH_SOURCE.manual,
    },
  });

  revalidateCalendar(workout.week.programId);
  return { ok: true };
}
