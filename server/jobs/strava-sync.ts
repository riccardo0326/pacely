import { prisma } from "@/lib/prisma";
import { listAthleteActivities } from "@/lib/strava/client";
import { JOB_STATUS, JOB_TYPE_STRAVA_BACKFILL } from "@/lib/strava/constants";
import { StravaRateLimitError } from "@/lib/strava/errors";
import { normalizeStravaActivity } from "@/lib/strava/normalize";
import {
  touchLastSync,
  upsertNormalizedActivity,
} from "@/lib/strava/persist-activity";
import { getValidAccessToken } from "@/lib/strava/tokens";
import { tryRecalculateUserMetrics } from "@/server/jobs/metrics-recalc";
import { processPendingBackfills } from "@/server/jobs/strava-backfill";

const INCREMENTAL_OVERLAP_SEC = 60;

export async function pollRecentActivitiesForUser(
  userId: string,
  options: { fetchImpl?: typeof fetch; maxPages?: number } = {},
): Promise<{ imported: number; paused: boolean }> {
  const connection = await prisma.stravaConnection.findUnique({
    where: { userId },
    select: { lastSyncAt: true },
  });
  if (!connection?.lastSyncAt) {
    return { imported: 0, paused: false };
  }

  const after =
    Math.floor(connection.lastSyncAt.getTime() / 1000) -
    INCREMENTAL_OVERLAP_SEC;
  const accessToken = await getValidAccessToken(userId, {
    fetchImpl: options.fetchImpl,
  });
  const maxPages = options.maxPages ?? 3;
  let imported = 0;

  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const result = await listAthleteActivities(
        { accessToken, page, after },
        options.fetchImpl,
      );
      if (result.payloads.length === 0) {
        break;
      }
      for (const payload of result.payloads) {
        const activity = normalizeStravaActivity(payload);
        if (!activity) {
          continue;
        }
        await upsertNormalizedActivity(userId, activity);
        imported += 1;
      }
      if (result.payloads.length < 200) {
        break;
      }
    }
    await touchLastSync(userId);
    if (imported > 0) {
      await tryRecalculateUserMetrics(userId);
    }
    return { imported, paused: false };
  } catch (error) {
    if (error instanceof StravaRateLimitError) {
      return { imported, paused: true };
    }
    throw error;
  }
}

export async function pollRecentActivitiesForConnectedUsers(options?: {
  maxUsers?: number;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const activeBackfills = await prisma.job.findMany({
    where: {
      type: JOB_TYPE_STRAVA_BACKFILL,
      status: { in: [JOB_STATUS.pending, JOB_STATUS.running] },
    },
    select: { userId: true },
  });
  const skip = new Set(activeBackfills.map((job) => job.userId));

  const connections = await prisma.stravaConnection.findMany({
    where: { lastSyncAt: { not: null } },
    select: { userId: true },
    take: options?.maxUsers ?? 20,
    orderBy: { lastSyncAt: "asc" },
  });

  for (const connection of connections) {
    if (skip.has(connection.userId)) {
      continue;
    }
    await pollRecentActivitiesForUser(connection.userId, {
      fetchImpl: options?.fetchImpl,
    });
  }
}

export async function runStravaSyncCron(options?: {
  fetchImpl?: typeof fetch;
}): Promise<void> {
  await processPendingBackfills({
    maxJobs: 5,
    maxPages: 5,
    fetchImpl: options?.fetchImpl,
  });
  await pollRecentActivitiesForConnectedUsers({
    fetchImpl: options?.fetchImpl,
  });
}
