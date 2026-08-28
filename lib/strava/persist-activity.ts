import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedActivity } from "@/lib/strava/normalize";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function jsonOrDbNull(
  value: unknown | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value == null ? Prisma.DbNull : toJsonValue(value);
}

export async function upsertNormalizedActivity(
  userId: string,
  activity: NormalizedActivity,
): Promise<void> {
  const data = {
    sport: activity.sport,
    name: activity.name,
    startedAt: activity.startedAt,
    durationSec: activity.durationSec,
    elapsedSec: activity.elapsedSec,
    distanceM: activity.distanceM,
    elevationGainM: activity.elevationGainM,
    averageHeartrate: activity.averageHeartrate,
    maxHeartrate: activity.maxHeartrate,
    averageWatts: activity.averageWatts,
    weightedWatts: activity.weightedWatts,
    averageCadence: activity.averageCadence,
    averageSpeedMps: activity.averageSpeedMps,
    perceivedExertion: activity.perceivedExertion,
    splits: jsonOrDbNull(activity.splits),
    sourceRaw: toJsonValue(activity.sourceRaw),
  };

  await prisma.activity.upsert({
    where: {
      userId_stravaActivityId: {
        userId,
        stravaActivityId: activity.stravaActivityId,
      },
    },
    create: {
      userId,
      stravaActivityId: activity.stravaActivityId,
      ...data,
    },
    update: data,
  });
}

export async function deleteUserActivity(
  userId: string,
  stravaActivityId: string,
): Promise<void> {
  await prisma.activity.deleteMany({
    where: { userId, stravaActivityId },
  });
}

export async function touchLastSync(
  userId: string,
  at = new Date(),
): Promise<void> {
  await prisma.stravaConnection.update({
    where: { userId },
    data: { lastSyncAt: at },
  });
}
