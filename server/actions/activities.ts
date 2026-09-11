"use server";

import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import {
  parseActivitySportFilter,
  type ActivitySportFilter,
} from "@/lib/strava/constants";

const ACTIVITY_PAGE_SIZE = 20;

type ActivityListItem = {
  id: string;
  stravaActivityId: string;
  name: string | null;
  sport: string;
  startedAt: string;
  durationSec: number;
  distanceM: number | null;
};

type ActivityListResult = {
  items: ActivityListItem[];
  total: number;
  page: number;
  pageSize: number;
  sport: ActivitySportFilter;
};

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export async function listActivities(
  sportParam?: string,
  pageParam?: string,
): Promise<ActivityListResult> {
  const user = await requireUser();
  const sport = parseActivitySportFilter(sportParam);
  const page = parsePage(pageParam);
  const where = {
    userId: user.id,
    ...(sport === "all" ? {} : { sport }),
  };

  const [total, rows] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * ACTIVITY_PAGE_SIZE,
      take: ACTIVITY_PAGE_SIZE,
      select: {
        id: true,
        stravaActivityId: true,
        name: true,
        sport: true,
        startedAt: true,
        durationSec: true,
        distanceM: true,
      },
    }),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
  const safePage = Math.min(page, lastPage);
  if (safePage !== page && total > 0) {
    const rerouted = await prisma.activity.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (safePage - 1) * ACTIVITY_PAGE_SIZE,
      take: ACTIVITY_PAGE_SIZE,
      select: {
        id: true,
        stravaActivityId: true,
        name: true,
        sport: true,
        startedAt: true,
        durationSec: true,
        distanceM: true,
      },
    });
    return {
      items: rerouted.map(toItem),
      total,
      page: safePage,
      pageSize: ACTIVITY_PAGE_SIZE,
      sport,
    };
  }

  return {
    items: rows.map(toItem),
    total,
    page,
    pageSize: ACTIVITY_PAGE_SIZE,
    sport,
  };
}

function toItem(row: {
  id: string;
  stravaActivityId: string;
  name: string | null;
  sport: string;
  startedAt: Date;
  durationSec: number;
  distanceM: number | null;
}): ActivityListItem {
  return {
    id: row.id,
    stravaActivityId: row.stravaActivityId,
    name: row.name,
    sport: row.sport,
    startedAt: row.startedAt.toISOString(),
    durationSec: row.durationSec,
    distanceM: row.distanceM,
  };
}
