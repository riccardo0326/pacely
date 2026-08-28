"use server";

import { requireUser } from "@/lib/auth/require-user";
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
  recent: Array<{
    id: string;
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
      take: 5,
      select: {
        id: true,
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
    recent: recent.map((activity) => ({
      id: activity.id,
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
  await enqueueStravaBackfill(user.id);
  await processBackfillChunk(user.id);
  return loadImportStatus(user.id);
}

export async function retryImport(): Promise<ImportStatus> {
  const user = await requireUser();
  await retryStravaBackfill(user.id);
  return loadImportStatus(user.id);
}

export async function syncRecentActivities(): Promise<ImportStatus> {
  const user = await requireUser();
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
}
