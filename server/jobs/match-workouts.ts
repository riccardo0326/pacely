import {
  addUtcDays,
  parseUtcDateKey,
  utcDateKey,
  utcToday,
} from "@/lib/metrics/dates";
import {
  AUTO_SKIP_GRACE_DAYS,
  MATCH_SOURCE,
  WORKOUT_STATUS,
} from "@/lib/matching/constants";
import { pairWorkoutsToActivities } from "@/lib/matching/heuristic";
import type { MatchableActivity, MatchableWorkout } from "@/lib/matching/types";
import { prisma } from "@/lib/prisma";
import { SPORTS, type Sport } from "@/lib/strava/constants";

function asSport(value: string): Sport | null {
  return (SPORTS as readonly string[]).includes(value)
    ? (value as Sport)
    : null;
}

function startOfUtcDay(date: Date): Date {
  return parseUtcDateKey(utcDateKey(date));
}

export async function matchUserWorkouts(
  userId: string,
): Promise<{ matched: number; autoSkipped: number }> {
  await prisma.workout.updateMany({
    where: {
      activityId: null,
      status: WORKOUT_STATUS.completed,
      week: { program: { userId } },
    },
    data: { status: WORKOUT_STATUS.planned, matchSource: null },
  });

  const graceCutoff = parseUtcDateKey(
    addUtcDays(utcToday(), -AUTO_SKIP_GRACE_DAYS),
  );
  const autoSkipped = await prisma.workout.updateMany({
    where: {
      activityId: null,
      status: WORKOUT_STATUS.planned,
      matchSource: null,
      plannedDate: { lt: graceCutoff },
      week: { program: { userId, status: "active" } },
    },
    data: { status: WORKOUT_STATUS.skipped },
  });

  const eligible = await prisma.workout.findMany({
    where: {
      activityId: null,
      OR: [{ matchSource: null }, { matchSource: MATCH_SOURCE.auto }],
      status: { in: [WORKOUT_STATUS.planned, WORKOUT_STATUS.skipped] },
      week: { program: { userId, status: "active" } },
    },
    select: {
      id: true,
      sport: true,
      plannedDate: true,
      durationMin: true,
    },
  });

  const workouts: MatchableWorkout[] = [];
  for (const row of eligible) {
    const sport = asSport(row.sport);
    if (!sport) {
      continue;
    }
    workouts.push({
      id: row.id,
      sport,
      plannedDate: row.plannedDate,
      durationMin: row.durationMin,
    });
  }

  if (workouts.length === 0) {
    return { matched: 0, autoSkipped: autoSkipped.count };
  }

  const times = workouts.map((workout) => workout.plannedDate.getTime());
  const minDate = startOfUtcDay(new Date(Math.min(...times)));
  const maxExclusive = startOfUtcDay(new Date(Math.max(...times)));
  maxExclusive.setUTCDate(maxExclusive.getUTCDate() + 1);

  const linked = await prisma.workout.findMany({
    where: {
      activityId: { not: null },
      week: { program: { userId } },
    },
    select: { activityId: true },
  });
  const takenIds = linked
    .map((row) => row.activityId)
    .filter((id): id is string => id !== null);

  const activityRows = await prisma.activity.findMany({
    where: {
      userId,
      startedAt: { gte: minDate, lt: maxExclusive },
      ...(takenIds.length > 0 ? { id: { notIn: takenIds } } : {}),
    },
    select: {
      id: true,
      sport: true,
      startedAt: true,
      durationSec: true,
    },
  });

  const activities: MatchableActivity[] = [];
  for (const row of activityRows) {
    const sport = asSport(row.sport);
    if (!sport) {
      continue;
    }
    activities.push({
      id: row.id,
      sport,
      startedAt: row.startedAt,
      durationSec: row.durationSec,
    });
  }

  const matches = pairWorkoutsToActivities(workouts, activities);

  if (matches.length > 0) {
    await prisma.$transaction(
      matches.map((match) =>
        prisma.workout.update({
          where: { id: match.workoutId },
          data: {
            activityId: match.activityId,
            status: WORKOUT_STATUS.completed,
            matchSource: MATCH_SOURCE.auto,
          },
        }),
      ),
    );
  }

  return { matched: matches.length, autoSkipped: autoSkipped.count };
}

/** Never throw: activity sync must succeed even if matching fails. */
export async function tryMatchUserWorkouts(userId: string): Promise<void> {
  try {
    await matchUserWorkouts(userId);
  } catch (error) {
    console.error("workout matching failed", { userId, error });
  }
}
