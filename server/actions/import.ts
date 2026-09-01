"use server";

import { requireUser } from "@/lib/auth/require-user";
import { USER_FACING_ERROR } from "@/lib/errors/user-facing";
import { prisma } from "@/lib/prisma";
import { JOB_STATUS, JOB_TYPE_STRAVA_BACKFILL } from "@/lib/strava/constants";
import {
  backfillProgressSchema,
  defaultBackfillProgress,
  type BackfillProgress,
} from "@/lib/strava/schemas";
import {
  enqueueStravaBackfill,
  processBackfillChunk,
  retryStravaBackfill,
} from "@/server/jobs/strava-backfill";
import { pollRecentActivitiesForUser } from "@/server/jobs/strava-sync";

export type ImportStatus = {
  job: {
    status: string;
    progress: BackfillProgress;
    error: string | null;
  } | null;
  activityCount: number;
  lastSyncAt: string | null;
  actionError: string | null;
  recent: Array<{
    id: string;
    stravaActivityId: string;
    name: string | null;
    sport: string;
    startedAt: string;
    distanceM: number | null;
  }>;
};

async function loadImportStatus(userId: string): Promise<ImportStatus> {
  const [job, activityCount, connection, recent] = await Promise.all([
    prisma.job.findFirst({
      where: { userId, type: JOB_TYPE_STRAVA_BACKFILL },
      orderBy: { createdAt: "desc" },
      select: { status: true, progress: true, error: true },
    }),
    prisma.activity.count({ where: { userId } }),
    prisma.stravaConnection.findUnique({
      where: { userId },
      select: { lastSyncAt: true },
    }),
    prisma.activity.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 7,
      select: {
        id: true,
        stravaActivityId: true,
        name: true,
        sport: true,
        startedAt: true,
        distanceM: true,
      },
    }),
  ]);

  const parsedProgress = job
    ? backfillProgressSchema.safeParse(job.progress)
    : null;
  const progress = parsedProgress?.success
    ? parsedProgress.data
    : defaultBackfillProgress();

  return {
    job: job ? { status: job.status, progress, error: job.error } : null,
    activityCount,
    lastSyncAt: connection?.lastSyncAt?.toISOString() ?? null,
    actionError: null,
    recent: recent.map((activity) => ({
      id: activity.id,
      stravaActivityId: activity.stravaActivityId,
      name: activity.name,
      sport: activity.sport,
      startedAt: activity.startedAt.toISOString(),
      distanceM: activity.distanceM,
    })),
  };
}

export async function getImportStatus(): Promise<ImportStatus> {
  const user = await requireUser();
  await enqueueStravaBackfill(user.id);
  return loadImportStatus(user.id);
}

export async function processImportChunk(): Promise<ImportStatus> {
  const user = await requireUser();
  try {
    await enqueueStravaBackfill(user.id);
    await processBackfillChunk(user.id);
    return loadImportStatus(user.id);
  } catch (error) {
    console.error("processImportChunk failed", error);
    const status = await loadImportStatus(user.id);
    return { ...status, actionError: USER_FACING_ERROR.importProcess };
  }
}

export async function retryImport(): Promise<ImportStatus> {
  const user = await requireUser();
  try {
    await retryStravaBackfill(user.id);
    return loadImportStatus(user.id);
  } catch (error) {
    console.error("retryImport failed", error);
    const status = await loadImportStatus(user.id);
    return { ...status, actionError: USER_FACING_ERROR.importRetry };
  }
}

export async function syncRecentActivities(): Promise<ImportStatus> {
  const user = await requireUser();
  try {
    const connection = await prisma.stravaConnection.findUnique({
      where: { userId: user.id },
      select: { lastSyncAt: true },
    });
    const activeBackfill = await prisma.job.findFirst({
      where: {
        userId: user.id,
        type: JOB_TYPE_STRAVA_BACKFILL,
        status: { in: [JOB_STATUS.pending, JOB_STATUS.running] },
      },
      select: { id: true },
    });

    if (connection?.lastSyncAt && !activeBackfill) {
      await pollRecentActivitiesForUser(user.id);
    }
    return loadImportStatus(user.id);
  } catch (error) {
    console.error("syncRecentActivities failed", error);
    const status = await loadImportStatus(user.id);
    return { ...status, actionError: USER_FACING_ERROR.importSync };
  }
}
