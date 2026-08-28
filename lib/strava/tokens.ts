import { decrypt, encrypt } from "@/lib/security/encryption";
import { prisma } from "@/lib/prisma";
import { StravaAuthError } from "@/lib/strava/errors";
import { stravaTokenResponseSchema } from "@/lib/strava/schemas";

export const STRAVA_TOKEN_URL = "https://www.strava.com/api/v3/oauth/token";
export const ACCESS_TOKEN_TTL_MS = 6 * 60 * 60 * 1000;
const EXPIRY_SKEW_MS = 5 * 60 * 1000;

export type StravaTokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type ConnectionRecord = {
  userId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  expiresAt: Date;
};

export type TokenStore = {
  findConnection(userId: string): Promise<ConnectionRecord | null>;
  saveTokens(
    userId: string,
    tokens: {
      accessTokenEncrypted: string;
      refreshTokenEncrypted: string;
      expiresAt: Date;
    },
  ): Promise<void>;
};

const prismaTokenStore: TokenStore = {
  findConnection(userId) {
    return prisma.stravaConnection.findUnique({ where: { userId } });
  },
  async saveTokens(userId, tokens) {
    await prisma.stravaConnection.update({
      where: { userId },
      data: tokens,
    });
  },
};

export async function refreshStravaTokens(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<StravaTokenSet> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new StravaAuthError(
      "STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET are required",
    );
  }

  const response = await fetchImpl(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new StravaAuthError(
      `Refresh token Strava fallito (${response.status})`,
      response.status,
    );
  }

  const parsed = stravaTokenResponseSchema.parse(await response.json());
  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token,
    expiresAt: new Date(parsed.expires_at * 1000),
  };
}

export async function getValidAccessToken(
  userId: string,
  options: {
    now?: () => number;
    store?: TokenStore;
    refresh?: typeof refreshStravaTokens;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<string> {
  const now = options.now ?? Date.now;
  const store = options.store ?? prismaTokenStore;
  const refresh = options.refresh ?? refreshStravaTokens;

  const connection = await store.findConnection(userId);
  if (!connection) {
    throw new StravaAuthError("Nessuna connessione Strava per questo utente");
  }

  if (connection.expiresAt.getTime() - EXPIRY_SKEW_MS > now()) {
    return decrypt(connection.accessTokenEncrypted);
  }

  const tokens = await refresh(
    decrypt(connection.refreshTokenEncrypted),
    options.fetchImpl,
  );

  await store.saveTokens(userId, {
    accessTokenEncrypted: encrypt(tokens.accessToken),
    refreshTokenEncrypted: encrypt(tokens.refreshToken),
    expiresAt: tokens.expiresAt,
  });

  return tokens.accessToken;
}

export function defaultExpiresAt(expiresAtUnixSeconds?: number): Date {
  if (expiresAtUnixSeconds) {
    return new Date(expiresAtUnixSeconds * 1000);
  }
  return new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
}
