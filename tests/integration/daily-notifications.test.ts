import { describe, expect, it, vi } from "vitest";
import {
  createAndDispatchNotification,
  type NotificationStore,
} from "@/lib/notifications/dispatch";
import { NOTIFICATION_TYPE } from "@/lib/notifications/constants";
import type { StoredPushSubscription } from "@/lib/notifications/push";
import { runDailyWorkoutNotifications } from "@/server/jobs/daily-notifications";
import type { PlannedWorkoutForNotify } from "@/server/jobs/daily-notifications";

function memoryStore(seed?: {
  existingKeys?: Set<string>;
  subscriptions?: StoredPushSubscription[];
}): NotificationStore & {
  notifications: Array<{ userId: string; dedupeKey: string; title: string }>;
  deletedIds: string[];
} {
  const notifications: Array<{
    userId: string;
    dedupeKey: string;
    title: string;
  }> = [];
  const existing = seed?.existingKeys ?? new Set<string>();
  const deletedIds: string[] = [];
  const subscriptions = seed?.subscriptions ?? [];

  return {
    notifications,
    deletedIds,
    async createNotification(input) {
      const key = `${input.userId}:${input.dedupeKey}`;
      if (existing.has(key)) {
        return { id: "existing", created: false };
      }
      existing.add(key);
      notifications.push({
        userId: input.userId,
        dedupeKey: input.dedupeKey,
        title: input.title,
      });
      return { id: `n-${notifications.length}`, created: true };
    },
    async listPushSubscriptions(userId) {
      return subscriptions.filter((row) => row.id.startsWith(userId));
    },
    async deletePushSubscription(id) {
      deletedIds.push(id);
    },
  };
}

function sub(userId: string, id: string): StoredPushSubscription {
  return {
    id: `${userId}-${id}`,
    endpoint: `https://push.example/${id}`,
    p256dh: "p256dh",
    auth: "auth",
  };
}

describe("daily workout notifications (mocked push)", () => {
  const today = new Date("2026-08-31T07:00:00.000Z");

  it("creates an in-app notification and sends push for planned workouts today", async () => {
    const store = memoryStore({
      subscriptions: [sub("user-1", "browser")],
    });
    const sendPush = vi.fn(async () => "ok" as const);
    const workouts: PlannedWorkoutForNotify[] = [
      {
        userId: "user-1",
        name: "Fondo",
        sport: "run",
        durationMin: 50,
        timeOfDay: null,
      },
    ];

    const result = await runDailyWorkoutNotifications(today, {
      lookup: { findPlannedWorkoutsOnDate: async () => workouts },
      store,
      sendPush,
    });

    expect(result).toEqual({
      notified: 1,
      skipped: 0,
      failed: 0,
      pushesSent: 1,
    });
    expect(store.notifications).toHaveLength(1);
    expect(store.notifications[0]?.dedupeKey).toBe("workout_today:2026-08-31");
    expect(sendPush).toHaveBeenCalledOnce();
    expect(sendPush).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1-browser" }),
      expect.objectContaining({
        title: "Allenamento di oggi",
        href: "/calendar",
      }),
    );
  });

  it("skips users with no planned workout today", async () => {
    const store = memoryStore();
    const sendPush = vi.fn(async () => "ok" as const);

    const result = await runDailyWorkoutNotifications(today, {
      lookup: { findPlannedWorkoutsOnDate: async () => [] },
      store,
      sendPush,
    });

    expect(result.notified).toBe(0);
    expect(store.notifications).toHaveLength(0);
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("does not send a second push when the daily reminder already exists", async () => {
    const store = memoryStore({
      existingKeys: new Set(["user-1:workout_today:2026-08-31"]),
      subscriptions: [sub("user-1", "browser")],
    });
    const sendPush = vi.fn(async () => "ok" as const);

    const result = await runDailyWorkoutNotifications(today, {
      lookup: {
        findPlannedWorkoutsOnDate: async () => [
          {
            userId: "user-1",
            name: "Fondo",
            sport: "run",
            durationMin: 50,
            timeOfDay: null,
          },
        ],
      },
      store,
      sendPush,
    });

    expect(result.skipped).toBe(1);
    expect(result.notified).toBe(0);
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("drops gone push subscriptions and still keeps the in-app notification", async () => {
    const store = memoryStore({
      subscriptions: [sub("user-1", "stale"), sub("user-1", "ok")],
    });
    const sendPush = vi.fn(async (subscription) =>
      subscription.id.endsWith("stale") ? ("gone" as const) : ("ok" as const),
    );

    const result = await createAndDispatchNotification(
      {
        userId: "user-1",
        type: NOTIFICATION_TYPE.workoutToday,
        title: "Allenamento di oggi",
        body: "Corsa",
        href: "/calendar",
        dedupeKey: "workout_today:2026-08-31",
      },
      { store, sendPush },
    );

    expect(result.created).toBe(true);
    expect(result.pushesSent).toBe(1);
    expect(result.pushesGone).toBe(1);
    expect(store.deletedIds).toEqual(["user-1-stale"]);
  });

  it("still saves the in-app notification when push sending fails", async () => {
    const store = memoryStore({
      subscriptions: [sub("user-1", "browser")],
    });
    const sendPush = vi.fn(async () => "error" as const);

    const result = await runDailyWorkoutNotifications(today, {
      lookup: {
        findPlannedWorkoutsOnDate: async () => [
          {
            userId: "user-1",
            name: "Fondo",
            sport: "run",
            durationMin: 50,
            timeOfDay: null,
          },
        ],
      },
      store,
      sendPush,
    });

    expect(result.notified).toBe(1);
    expect(result.pushesSent).toBe(0);
    expect(store.notifications).toHaveLength(1);
  });
});
