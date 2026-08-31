import {
  NOTIFICATION_CRON_MAX_USERS,
  NOTIFICATION_TYPE,
  PROGRAM_STATUS_ACTIVE,
  buildWorkoutTodayContent,
  createAndDispatchNotification,
  workoutTodayDedupeKey,
  type NotificationStore,
  type PushSender,
} from "@/lib/notifications";
import { utcDateKey, addUtcDays } from "@/lib/metrics/dates";
import { WORKOUT_STATUS } from "@/lib/matching/constants";
import { prisma } from "@/lib/prisma";

export type PlannedWorkoutForNotify = {
  userId: string;
  name: string;
  sport: string;
  durationMin: number;
  timeOfDay: string | null;
};

export type DailyNotificationLookup = {
  findPlannedWorkoutsOnDate(
    dateKey: string,
  ): Promise<PlannedWorkoutForNotify[]>;
};

const prismaDailyLookup: DailyNotificationLookup = {
  async findPlannedWorkoutsOnDate(dateKey) {
    const start = new Date(`${dateKey}T00:00:00.000Z`);
    const end = new Date(`${addUtcDays(dateKey, 1)}T00:00:00.000Z`);
    const rows = await prisma.workout.findMany({
      where: {
        status: WORKOUT_STATUS.planned,
        plannedDate: { gte: start, lt: end },
        week: { program: { status: PROGRAM_STATUS_ACTIVE } },
      },
      select: {
        name: true,
        sport: true,
        durationMin: true,
        timeOfDay: true,
        week: { select: { program: { select: { userId: true } } } },
      },
      orderBy: { plannedDate: "asc" },
    });
    return rows.map((row) => ({
      userId: row.week.program.userId,
      name: row.name,
      sport: row.sport,
      durationMin: row.durationMin,
      timeOfDay: row.timeOfDay,
    }));
  },
};

function groupByUser(
  workouts: PlannedWorkoutForNotify[],
): Map<string, PlannedWorkoutForNotify[]> {
  const byUser = new Map<string, PlannedWorkoutForNotify[]>();
  for (const workout of workouts) {
    const list = byUser.get(workout.userId) ?? [];
    list.push(workout);
    byUser.set(workout.userId, list);
  }
  return byUser;
}

export type DailyNotificationCronResult = {
  notified: number;
  skipped: number;
  failed: number;
  pushesSent: number;
};

export async function runDailyWorkoutNotifications(
  now = new Date(),
  deps: {
    lookup?: DailyNotificationLookup;
    store?: NotificationStore;
    sendPush?: PushSender;
    maxUsers?: number;
  } = {},
): Promise<DailyNotificationCronResult> {
  const lookup = deps.lookup ?? prismaDailyLookup;
  const dateKey = utcDateKey(now);
  const scheduledAt = new Date(`${dateKey}T00:00:00.000Z`);
  const dedupeKey = workoutTodayDedupeKey(dateKey);
  const maxUsers = deps.maxUsers ?? NOTIFICATION_CRON_MAX_USERS;

  const workouts = await lookup.findPlannedWorkoutsOnDate(dateKey);
  const byUser = groupByUser(workouts);
  const userIds = [...byUser.keys()].slice(0, maxUsers);

  let notified = 0;
  let skipped = 0;
  let failed = 0;
  let pushesSent = 0;

  for (const userId of userIds) {
    const userWorkouts = byUser.get(userId) ?? [];
    const content = buildWorkoutTodayContent(userWorkouts);
    try {
      const result = await createAndDispatchNotification(
        {
          userId,
          type: NOTIFICATION_TYPE.workoutToday,
          title: content.title,
          body: content.body,
          href: content.href,
          dedupeKey,
          scheduledAt,
        },
        { store: deps.store, sendPush: deps.sendPush },
      );
      if (result.created) {
        notified += 1;
        pushesSent += result.pushesSent;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(
        `daily workout notification failed for user ${userId}`,
        error,
      );
    }
  }

  return { notified, skipped, failed, pushesSent };
}
