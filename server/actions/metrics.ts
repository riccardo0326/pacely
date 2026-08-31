"use server";

import { requireUser } from "@/lib/auth/require-user";
import { thresholdSpeedMpsFromVdot } from "@/lib/metrics/vdot";
import { computeIntensityZones } from "@/lib/metrics/zones";
import type { MetricsPanelData } from "@/components/metrics-panel";
import { prisma } from "@/lib/prisma";
import { tryRecalculateUserMetrics } from "@/server/jobs/metrics-recalc";

const HISTORY_DAYS = 90;

export async function getDashboardMetrics(): Promise<MetricsPanelData> {
  const user = await requireUser();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - HISTORY_DAYS);
  since.setUTCHours(0, 0, 0, 0);

  const [initialSnapshots, maxHr, activityCount] = await Promise.all([
    prisma.performanceMetricSnapshot.findMany({
      where: { userId: user.id, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
    prisma.activity.aggregate({
      where: { userId: user.id },
      _max: { maxHeartrate: true },
    }),
    prisma.activity.count({ where: { userId: user.id } }),
  ]);

  let snapshots = initialSnapshots;
  if (activityCount > 0 && snapshots.length === 0) {
    await tryRecalculateUserMetrics(user.id);
    snapshots = await prisma.performanceMetricSnapshot.findMany({
      where: { userId: user.id, date: { gte: since } },
      orderBy: { date: "asc" },
    });
  }

  const latestRow = snapshots.at(-1);
  if (!latestRow) {
    return { latest: null, history: [], zones: [] };
  }

  const vdot = latestRow.vdot;
  const zones = computeIntensityZones({
    ftpWatts: latestRow.ftp,
    vdot,
    runThresholdMps: vdot === null ? null : thresholdSpeedMpsFromVdot(vdot),
    swimThresholdPaceSecPer100m: latestRow.swimThresholdPaceSecPer100m,
    lthr: null,
    maxHeartrate: maxHr._max.maxHeartrate,
  });

  return {
    latest: {
      date: latestRow.date.toISOString().slice(0, 10),
      ctl: latestRow.ctl,
      atl: latestRow.atl,
      tsb: latestRow.tsb,
      ftp: latestRow.ftp,
      vdot: latestRow.vdot,
      swimThresholdPaceSecPer100m: latestRow.swimThresholdPaceSecPer100m,
    },
    history: snapshots.map((snapshot) => ({
      date: snapshot.date.toISOString().slice(0, 10),
      ctl: snapshot.ctl,
      atl: snapshot.atl,
      tsb: snapshot.tsb,
      tss: 0,
      sportBreakdown: {},
    })),
    zones,
  };
}
