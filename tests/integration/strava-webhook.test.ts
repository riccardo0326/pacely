import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/strava/webhook/route";
import type { NormalizedActivity } from "@/lib/strava/normalize";
import {
  handleStravaWebhookEvent,
  verifyStravaSubscription,
} from "@/lib/strava/webhook";

const VERIFY_TOKEN = "webhook-verify-token";

describe("Strava webhook verification", () => {
  it("echoes hub.challenge when the verify token matches", () => {
    expect(
      verifyStravaSubscription({
        mode: "subscribe",
        challenge: "challenge-123",
        verifyToken: VERIFY_TOKEN,
        expectedToken: VERIFY_TOKEN,
      }),
    ).toEqual({ ok: true, challenge: "challenge-123" });
  });

  it("rejects a missing or wrong verify token", () => {
    expect(
      verifyStravaSubscription({
        mode: "subscribe",
        challenge: "challenge-123",
        verifyToken: "nope",
        expectedToken: VERIFY_TOKEN,
      }),
    ).toEqual({ ok: false, status: 403 });
  });
});

describe("Strava webhook GET handshake", () => {
  it("returns hub.challenge as JSON", async () => {
    process.env.STRAVA_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN;
    const request = new Request(
      `http://localhost/api/strava/webhook?hub.mode=subscribe&hub.challenge=abc&hub.verify_token=${VERIFY_TOKEN}`,
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ "hub.challenge": "abc" });
  });
});

describe("Strava webhook event handling", () => {
  const runPayload = {
    id: 555,
    name: "Tempo",
    distance: 8000,
    moving_time: 1800,
    elapsed_time: 1850,
    sport_type: "Run",
    type: "Run",
    start_date: "2026-04-01T06:00:00Z",
  };

  it("upserts a created activity for the owning user", async () => {
    const upsertActivity = vi.fn();
    const touchLastSync = vi.fn();
    const result = await handleStravaWebhookEvent(
      {
        object_type: "activity",
        object_id: 555,
        aspect_type: "create",
        owner_id: 42,
      },
      {
        findUserByStravaAthleteId: async () => ({ id: "user-1" }),
        fetchActivity: async () => runPayload,
        upsertActivity,
        deleteActivity: vi.fn(),
        touchLastSync,
      },
    );

    expect(result).toEqual({ ignored: false });
    expect(upsertActivity).toHaveBeenCalledOnce();
    const saved = upsertActivity.mock.calls[0]?.[1] as NormalizedActivity;
    expect(saved.stravaActivityId).toBe("555");
    expect(saved.sport).toBe("run");
    expect(touchLastSync).toHaveBeenCalledWith("user-1");
  });

  it("deletes on aspect_type=delete", async () => {
    const deleteActivity = vi.fn();
    await handleStravaWebhookEvent(
      {
        object_type: "activity",
        object_id: 555,
        aspect_type: "delete",
        owner_id: 42,
      },
      {
        findUserByStravaAthleteId: async () => ({ id: "user-1" }),
        fetchActivity: vi.fn(),
        upsertActivity: vi.fn(),
        deleteActivity,
        touchLastSync: vi.fn(),
      },
    );
    expect(deleteActivity).toHaveBeenCalledWith("user-1", "555");
  });

  it("ignores events for unknown athletes", async () => {
    const upsertActivity = vi.fn();
    const result = await handleStravaWebhookEvent(
      {
        object_type: "activity",
        object_id: 1,
        aspect_type: "create",
        owner_id: 99,
      },
      {
        findUserByStravaAthleteId: async () => null,
        fetchActivity: vi.fn(),
        upsertActivity,
        deleteActivity: vi.fn(),
        touchLastSync: vi.fn(),
      },
    );
    expect(result.ignored).toBe(true);
    expect(upsertActivity).not.toHaveBeenCalled();
  });
});

describe("Strava webhook POST route", () => {
  it("rejects invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/strava/webhook", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(response.status).toBe(400);
  });
});
