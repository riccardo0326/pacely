import type { User } from "@prisma/client";
import { encrypt } from "@/lib/security/encryption";
import { prisma } from "@/lib/prisma";
import { stravaAthleteSchema } from "@/lib/strava/schemas";
import { defaultExpiresAt } from "@/lib/strava/tokens";

export type PersistStravaSessionInput = {
  athleteId: string;
  firstname?: string;
  lastname?: string;
  name?: string;
  email?: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAtUnixSeconds?: number;
  scope: string;
};

export type StravaUserStore = {
  user: {
    upsert: (args: {
      where: { stravaAthleteId: string };
      create: {
        stravaAthleteId: string;
        name: string;
        email: string | null;
        role: string;
      };
      update: { name: string; email: string | null };
    }) => Promise<User>;
  };
  stravaConnection: {
    upsert: (args: {
      where: { userId: string };
      create: {
        userId: string;
        accessTokenEncrypted: string;
        refreshTokenEncrypted: string;
        expiresAt: Date;
        scope: string;
      };
      update: {
        accessTokenEncrypted: string;
        refreshTokenEncrypted: string;
        expiresAt: Date;
        scope: string;
      };
    }) => Promise<unknown>;
  };
};

export function athleteDisplayName(input: {
  name?: string;
  firstname?: string;
  lastname?: string;
}): string {
  if (input.name?.trim()) {
    return input.name.trim();
  }
  return `${input.firstname ?? ""} ${input.lastname ?? ""}`.trim() || "Atleta";
}

export async function persistStravaSession(
  input: PersistStravaSessionInput,
  db: StravaUserStore = prisma as unknown as StravaUserStore,
): Promise<User> {
  const athlete = stravaAthleteSchema.parse({
    id: input.athleteId,
    firstname: input.firstname,
    lastname: input.lastname,
  });
  const name = athleteDisplayName({
    name: input.name,
    firstname: athlete.firstname,
    lastname: athlete.lastname,
  });
  const email = input.email?.trim() ? input.email.trim() : null;

  const user = await db.user.upsert({
    where: { stravaAthleteId: athlete.id },
    create: {
      stravaAthleteId: athlete.id,
      name,
      email,
      role: "athlete",
    },
    update: { name, email },
  });

  const tokenFields = {
    accessTokenEncrypted: encrypt(input.accessToken),
    refreshTokenEncrypted: encrypt(input.refreshToken),
    expiresAt: defaultExpiresAt(input.expiresAtUnixSeconds),
    scope: input.scope,
  };

  await db.stravaConnection.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...tokenFields },
    update: tokenFields,
  });

  return user;
}
