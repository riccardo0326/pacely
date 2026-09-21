import { describe, expect, it } from "vitest";
import type { ImportStatus, RecentActivityItem } from "@/server/actions/import";

describe("ImportStatus types and structure", () => {
  it("supports recentProgram and recentExtra partitions", () => {
    const programActivity: RecentActivityItem = {
      id: "act-1",
      stravaActivityId: "strava-1",
      name: "Corsa Interval",
      sport: "run",
      startedAt: new Date().toISOString(),
      distanceM: 5000,
    };

    const extraActivity: RecentActivityItem = {
      id: "act-2",
      stravaActivityId: "strava-2",
      name: "Camminata in montagna",
      sport: "other",
      startedAt: new Date().toISOString(),
      distanceM: 8000,
    };

    const status: ImportStatus = {
      job: null,
      activityCount: 2,
      lastSyncAt: new Date().toISOString(),
      actionError: null,
      hasActiveProgram: true,
      recent: [programActivity, extraActivity],
      recentProgram: [programActivity],
      recentExtra: [extraActivity],
    };

    expect(status.hasActiveProgram).toBe(true);
    expect(status.recentProgram).toHaveLength(1);
    expect(status.recentProgram[0].id).toBe("act-1");
    expect(status.recentExtra).toHaveLength(1);
    expect(status.recentExtra[0].id).toBe("act-2");
    expect(status.recent).toHaveLength(2);
  });
});
