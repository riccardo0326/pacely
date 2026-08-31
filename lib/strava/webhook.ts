import { prisma } from "@/lib/prisma";
import { fetchStravaActivity } from "@/lib/strava/client";
import { StravaApiError } from "@/lib/strava/errors";
import { normalizeStravaActivity } from "@/lib/strava/normalize";
import {
  deleteUserActivity,
  touchLastSync,
  upsertNormalizedActivity,
} from "@/lib/strava/persist-activity";
import { stravaWebhookEventSchema } from "@/lib/strava/schemas";
import { getValidAccessToken } from "@/lib/strava/tokens";
import { tryRecalculateUserMetrics } from "@/server/jobs/metrics-recalc";

export function verifyStravaSubscription(input: {
  mode: string | null;
  challenge: string | null;
  verifyToken: string | null;
  expectedToken: string | undefined;
}): { ok: true; challenge: string } | { ok: false; status: number } {
  if (input.mode !== "subscribe" || !input.challenge) {
    return { ok: false, status: 400 };
  }
  if (!input.expectedToken || input.verifyToken !== input.expectedToken) {
    return { ok: false, status: 403 };
  }
  return { ok: true, challenge: input.challenge };
}

export type WebhookDeps = {
  findUserByStravaAthleteId: (
    stravaAthleteId: string,
  ) => Promise<{ id: string } | null>;
  fetchActivity: (userId: string, stravaActivityId: string) => Promise<unknown>;
  upsertActivity: typeof upsertNormalizedActivity;
  deleteActivity: typeof deleteUserActivity;
  touchLastSync: typeof touchLastSync;
  recalculateMetrics?: (userId: string) => Promise<void>;
};

export const prismaWebhookDeps: WebhookDeps = {
  findUserByStravaAthleteId: (stravaAthleteId) =>
    prisma.user.findUnique({
      where: { stravaAthleteId },
      select: { id: true },
    }),
  async fetchActivity(userId, stravaActivityId) {
    const accessToken = await getValidAccessToken(userId);
    return fetchStravaActivity(accessToken, stravaActivityId);
  },
  upsertActivity: upsertNormalizedActivity,
  deleteActivity: deleteUserActivity,
  touchLastSync,
  recalculateMetrics: tryRecalculateUserMetrics,
};

export async function handleStravaWebhookEvent(
  body: unknown,
  deps: WebhookDeps = prismaWebhookDeps,
): Promise<{ ignored: boolean }> {
  const event = stravaWebhookEventSchema.parse(body);

  if (event.object_type !== "activity") {
    return { ignored: true };
  }

  const user = await deps.findUserByStravaAthleteId(event.owner_id);
  if (!user) {
    return { ignored: true };
  }

  if (event.aspect_type === "delete") {
    await deps.deleteActivity(user.id, event.object_id);
    await deps.touchLastSync(user.id);
    await deps.recalculateMetrics?.(user.id);
    return { ignored: false };
  }

  try {
    const payload = await deps.fetchActivity(user.id, event.object_id);
    const activity = normalizeStravaActivity(payload);
    if (!activity) {
      return { ignored: true };
    }
    await deps.upsertActivity(user.id, activity);
    await deps.touchLastSync(user.id);
    await deps.recalculateMetrics?.(user.id);
    return { ignored: false };
  } catch (error) {
    if (error instanceof StravaApiError && error.status === 404) {
      return { ignored: true };
    }
    throw error;
  }
}
