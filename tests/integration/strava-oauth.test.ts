import { afterEach, describe, expect, it, vi } from "vitest";
import { encrypt } from "@/lib/security/encryption";
import { persistStravaSession } from "@/lib/strava/persist-session";
import {
  getValidAccessToken,
  refreshStravaTokens,
  STRAVA_TOKEN_URL,
} from "@/lib/strava/tokens";
import { decrypt } from "@/lib/security/encryption";
import type { User } from "@prisma/client";
import { StravaAuthError } from "@/lib/strava/errors";

const TEST_KEY = "a".repeat(64);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stravaTokenJson(overrides: Record<string, unknown> = {}) {
  return {
    token_type: "Bearer",
    access_token: "new-access",
    refresh_token: "new-refresh",
    expires_at: 2_000_000_000,
    expires_in: 21600,
    ...overrides,
  };
}

describe("Strava OAuth persistence (mocked Strava)", () => {
  it("upserts the athlete and stores encrypted tokens", async () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const user: User = {
      id: "user-1",
      stravaAthleteId: "12345",
      name: "Ada Lovelace",
      email: null,
      role: "athlete",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const upsertUser = vi.fn().mockResolvedValue(user);
    const upsertConnection = vi.fn().mockResolvedValue({});

    await persistStravaSession(
      {
        athleteId: "12345",
        firstname: "Ada",
        lastname: "Lovelace",
        accessToken: "access-raw",
        refreshToken: "refresh-raw",
        expiresAtUnixSeconds: 1_700_000_000,
        scope: "read,activity:read_all,profile:read_all",
      },
      {
        user: { upsert: upsertUser },
        stravaConnection: { upsert: upsertConnection },
      },
    );

    expect(upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stravaAthleteId: "12345" },
        create: expect.objectContaining({
          stravaAthleteId: "12345",
          name: "Ada Lovelace",
          role: "athlete",
        }),
      }),
    );

    const connectionArgs = upsertConnection.mock.calls[0]?.[0] as {
      create: {
        accessTokenEncrypted: string;
        refreshTokenEncrypted: string;
        userId: string;
        scope: string;
      };
    };
    expect(connectionArgs.create.userId).toBe("user-1");
    expect(decrypt(connectionArgs.create.accessTokenEncrypted)).toBe(
      "access-raw",
    );
    expect(decrypt(connectionArgs.create.refreshTokenEncrypted)).toBe(
      "refresh-raw",
    );
    expect(connectionArgs.create.scope).toContain("activity:read_all");
  });
});

describe("Strava token refresh (mocked Strava)", () => {
  it("exchanges the refresh token and returns a new access token", async () => {
    process.env.STRAVA_CLIENT_ID = "test-client";
    process.env.STRAVA_CLIENT_SECRET = "test-secret";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => stravaTokenJson(),
    });

    const tokens = await refreshStravaTokens("old-refresh", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      STRAVA_TOKEN_URL,
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchImpl.mock.calls[0]?.[1] as { body: URLSearchParams };
    expect(init.body.get("grant_type")).toBe("refresh_token");
    expect(init.body.get("refresh_token")).toBe("old-refresh");
    expect(tokens.accessToken).toBe("new-access");
    expect(tokens.refreshToken).toBe("new-refresh");
  });

  it("returns the stored access token when it is still valid", async () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const access = encrypt("still-valid");
    const token = await getValidAccessToken("user-1", {
      now: () => 1_000,
      store: {
        findConnection: async () => ({
          userId: "user-1",
          accessTokenEncrypted: access,
          refreshTokenEncrypted: encrypt("refresh"),
          expiresAt: new Date(1_000 + 6 * 60 * 60 * 1000),
        }),
        saveTokens: vi.fn(),
      },
    });
    expect(token).toBe("still-valid");
  });

  it("refreshes and persists rotated tokens when close to expiry", async () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    process.env.STRAVA_CLIENT_ID = "test-client";
    process.env.STRAVA_CLIENT_SECRET = "test-secret";
    const saveTokens = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => stravaTokenJson(),
    });

    const token = await getValidAccessToken("user-1", {
      now: () => 1_700_000_000_000,
      fetchImpl,
      store: {
        findConnection: async () => ({
          userId: "user-1",
          accessTokenEncrypted: encrypt("old-access"),
          refreshTokenEncrypted: encrypt("old-refresh"),
          expiresAt: new Date(1_700_000_000_000 + 60_000),
        }),
        saveTokens,
      },
    });

    expect(token).toBe("new-access");
    expect(saveTokens).toHaveBeenCalledOnce();
    const saved = saveTokens.mock.calls[0]?.[1] as {
      accessTokenEncrypted: string;
      refreshTokenEncrypted: string;
    };
    expect(decrypt(saved.accessTokenEncrypted)).toBe("new-access");
    expect(decrypt(saved.refreshTokenEncrypted)).toBe("new-refresh");
  });

  it("surfaces a clear error when Strava refresh fails", async () => {
    process.env.STRAVA_CLIENT_ID = "test-client";
    process.env.STRAVA_CLIENT_SECRET = "test-secret";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(refreshStravaTokens("dead", fetchImpl)).rejects.toBeInstanceOf(
      StravaAuthError,
    );
  });
});
