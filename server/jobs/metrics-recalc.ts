import { Prisma } from "@prisma/client";
import { JOB_TYPE_METRICS_RECALC } from "@/lib/metrics/constants";
import { computeMetricSnapshots } from "@/lib/metrics/compute";
import { parseUtcDateKey } from "@/lib/metrics/dates";
import type { ActivityMetricsInput, SportBreakdown } from "@/lib/metrics/types";
import { prisma } from "@/lib/prisma";
import { JOB_STATUS } from "@/lib/strava/constants";
import { sportBreakdownSchema } from "@/lib/validation/metrics";

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function activityToInput(row: {
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
}): ActivityMetricsInput | null {
  if (row.sport !== "run" && row.sport !== "swim" && row.sport !== "ride") {
    return null;
  }
  return {
    sport: row.sport,
    startedAt: row.startedAt,
    durationSec: row.durationSec,
    distanceM: row.distanceM,
    elevationGainM: row.elevationGainM,
    averageHeartrate: row.averageHeartrate,
    maxHeartrate: row.maxHeartrate,
    averageWatts: row.averageWatts,
    weightedWatts: row.weightedWatts,
    averageSpeedMps: row.averageSpeedMps,
    perceivedExertion: row.perceivedExertion,
  };
}

async function upsertMetricsJob(
  userId: string,
  status: string,
  error: string | null,
): Promise<void> {
  const existing = await prisma.job.findFirst({
    where: { userId, type: JOB_TYPE_METRICS_RECALC },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const data = {
    status,
    error,
    startedAt: status === JOB_STATUS.running ? new Date() : undefined,
    finishedAt:
      status === JOB_STATUS.done || status === JOB_STATUS.failed
        ? new Date()
        : null,
  };
  if (existing) {
    await prisma.job.update({ where: { id: existing.id }, data });
    return;
  }
  await prisma.job.create({
    data: {
      userId,
      type: JOB_TYPE_METRICS_RECALC,
      ...data,
      startedAt: data.startedAt ?? new Date(),
    },
  });
}

export async function recalculateUserMetrics(userId: string): Promise<void> {
  await upsertMetricsJob(userId, JOB_STATUS.running, null);

  try {
    const rows = await prisma.activity.findMany({
      where: { userId },
      select: {
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
      orderBy: { startedAt: "asc" },
    });

    const activities = rows
      .map(activityToInput)
      .filter((row): row is ActivityMetricsInput => row !== null);

    const snapshots = computeMetricSnapshots(activities);

    await prisma.$transaction(async (tx) => {
      await tx.performanceMetricSnapshot.deleteMany({ where: { userId } });
      if (snapshots.length === 0) {
        return;
      }
      await tx.performanceMetricSnapshot.createMany({
        data: snapshots.map((snapshot) => {
          const breakdown = sportBreakdownSchema.parse(
            snapshot.sportBreakdown,
          ) as SportBreakdown;
          return {
            userId,
            date: parseUtcDateKey(snapshot.date),
            ctl: round(snapshot.ctl, 2),
            atl: round(snapshot.atl, 2),
            tsb: round(snapshot.tsb, 2),
            ftp: snapshot.ftp === null ? null : round(snapshot.ftp, 1),
            vdot: snapshot.vdot === null ? null : round(snapshot.vdot, 2),
            swimThresholdPaceSecPer100m:
              snapshot.swimThresholdPaceSecPer100m === null
                ? null
                : round(snapshot.swimThresholdPaceSecPer100m, 1),
            sportBreakdown: toJsonValue(breakdown),
          };
        }),
      });
    });

    await upsertMetricsJob(userId, JOB_STATUS.done, null);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ricalcolo metriche fallito";
    await upsertMetricsJob(userId, JOB_STATUS.failed, message);
    throw error;
  }
}

/** Never throw: activity sync must succeed even if PMC recalc fails. */
export async function tryRecalculateUserMetrics(userId: string): Promise<void> {
  try {
    await recalculateUserMetrics(userId);
  } catch (error) {
    console.error("metrics recalc failed", { userId, error });
  }
}
