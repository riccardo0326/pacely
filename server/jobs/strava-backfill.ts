import { prisma } from "@/lib/prisma";
import { listAthleteActivities } from "@/lib/strava/client";
import { JOB_STATUS, JOB_TYPE_STRAVA_BACKFILL } from "@/lib/strava/constants";
import { StravaRateLimitError } from "@/lib/strava/errors";
import { applyBackfillPage } from "@/lib/strava/normalize";
import { upsertNormalizedActivity } from "@/lib/strava/persist-activity";
import {
  backfillProgressSchema,
  defaultBackfillProgress,
  type BackfillProgress,
} from "@/lib/strava/schemas";
import { getValidAccessToken } from "@/lib/strava/tokens";
import { tryRecalculateUserMetrics } from "@/server/jobs/metrics-recalc";
import { tryMatchUserWorkouts } from "@/server/jobs/match-workouts";

const PAGES_PER_CHUNK = 2;

function readProgress(value: unknown): BackfillProgress {
  const parsed = backfillProgressSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultBackfillProgress();
}

export async function enqueueStravaBackfill(userId: string): Promise<void> {
  const connection = await prisma.stravaConnection.findUnique({
    where: { userId },
    select: { lastSyncAt: true },
  });
  if (!connection || connection.lastSyncAt) {
    return;
  }

  const existing = await prisma.job.findFirst({
    where: {
      userId,
      type: JOB_TYPE_STRAVA_BACKFILL,
      status: { in: [JOB_STATUS.pending, JOB_STATUS.running] },
    },
    select: { id: true },
  });
  if (existing) {
    return;
  }

  const failed = await prisma.job.findFirst({
    where: {
      userId,
      type: JOB_TYPE_STRAVA_BACKFILL,
      status: JOB_STATUS.failed,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (failed) {
    return;
  }

  await prisma.job.create({
    data: {
      userId,
      type: JOB_TYPE_STRAVA_BACKFILL,
      status: JOB_STATUS.pending,
      progress: defaultBackfillProgress(),
    },
  });
}

export async function retryStravaBackfill(userId: string): Promise<void> {
  const job = await prisma.job.findFirst({
    where: { userId, type: JOB_TYPE_STRAVA_BACKFILL },
    orderBy: { createdAt: "desc" },
  });
  if (!job) {
    await enqueueStravaBackfill(userId);
    return;
  }
  if (job.status === JOB_STATUS.done) {
    return;
  }

  const progress = readProgress(job.progress);
  delete progress.rateLimitedUntil;
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: JOB_STATUS.pending,
      error: null,
      finishedAt: null,
      progress,
    },
  });
}

export type BackfillChunkResult = {
  status: string;
  progress: BackfillProgress;
  paused: boolean;
  error?: string;
};

export async function processBackfillChunk(
  userId: string,
  options: { maxPages?: number; fetchImpl?: typeof fetch } = {},
): Promise<BackfillChunkResult | null> {
  const job = await prisma.job.findFirst({
    where: {
      userId,
      type: JOB_TYPE_STRAVA_BACKFILL,
      status: { in: [JOB_STATUS.pending, JOB_STATUS.running] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!job) {
    return null;
  }

  const progress = readProgress(job.progress);
  if (
    progress.rateLimitedUntil &&
    Date.parse(progress.rateLimitedUntil) > Date.now()
  ) {
    return { status: job.status, progress, paused: true };
  }

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: JOB_STATUS.running,
      startedAt: job.startedAt ?? new Date(),
      error: null,
    },
  });

  let current = progress;

  try {
    const accessToken = await getValidAccessToken(userId, {
      fetchImpl: options.fetchImpl,
    });
    const maxPages = options.maxPages ?? PAGES_PER_CHUNK;

    for (let i = 0; i < maxPages; i += 1) {
      const page = await listAthleteActivities(
        { accessToken, page: current.page },
        options.fetchImpl,
      );

      if (page.payloads.length === 0) {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: JOB_STATUS.done,
            progress: current,
            finishedAt: new Date(),
            error: null,
          },
        });
        await prisma.stravaConnection.update({
          where: { userId },
          data: { lastSyncAt: new Date() },
        });
        await tryRecalculateUserMetrics(userId);
        await tryMatchUserWorkouts(userId);
        return { status: JOB_STATUS.done, progress: current, paused: false };
      }

      const applied = applyBackfillPage(current, page.payloads);
      for (const activity of applied.activities) {
        await upsertNormalizedActivity(userId, activity);
      }
      current = applied.progress;
      await prisma.job.update({
        where: { id: job.id },
        data: { progress: current },
      });
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { status: JOB_STATUS.pending, progress: current },
    });
    await tryRecalculateUserMetrics(userId);
    await tryMatchUserWorkouts(userId);
    return { status: JOB_STATUS.pending, progress: current, paused: false };
  } catch (error) {
    if (error instanceof StravaRateLimitError) {
      const paused: BackfillProgress = {
        ...current,
        rateLimitedUntil: new Date(
          Date.now() + error.retryAfterMs,
        ).toISOString(),
      };
      await prisma.job.update({
        where: { id: job.id },
        data: { status: JOB_STATUS.pending, progress: paused },
      });
      return { status: JOB_STATUS.pending, progress: paused, paused: true };
    }

    const message =
      error instanceof Error ? error.message : "Import storico fallito";
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JOB_STATUS.failed,
        error: message,
        finishedAt: new Date(),
      },
    });
    return {
      status: JOB_STATUS.failed,
      progress,
      paused: false,
      error: message,
    };
  }
}

export async function processPendingBackfills(options?: {
  maxJobs?: number;
  maxPages?: number;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const jobs = await prisma.job.findMany({
    where: {
      type: JOB_TYPE_STRAVA_BACKFILL,
      status: { in: [JOB_STATUS.pending, JOB_STATUS.running] },
    },
    orderBy: { createdAt: "asc" },
    take: options?.maxJobs ?? 5,
    select: { userId: true },
  });

  for (const job of jobs) {
    await processBackfillChunk(job.userId, {
      maxPages: options?.maxPages,
      fetchImpl: options?.fetchImpl,
    });
  }
}
