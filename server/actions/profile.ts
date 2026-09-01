"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { USER_FACING_ERROR, toUserFacingError } from "@/lib/errors/user-facing";
import { WEIGHT_SOURCE } from "@/lib/profile/constants";
import { prisma } from "@/lib/prisma";
import { routes } from "@/lib/routes";
import { fetchAthlete } from "@/lib/strava/client";
import { StravaApiError } from "@/lib/strava/errors";
import { stravaDetailedAthleteSchema } from "@/lib/strava/schemas";
import { persistStravaAthleteProfile } from "@/lib/strava/sync-profile";
import { getValidAccessToken } from "@/lib/strava/tokens";
import {
  createGearFormSchema,
  gearIdFormSchema,
  updateGearFormSchema,
  updateProfileFormSchema,
} from "@/lib/validation/profile";

export type ProfileActionResult = { ok: true } | { ok: false; error: string };

export type GearView = {
  id: string;
  sport: string;
  kind: string;
  name: string;
  stravaGearId: string | null;
  isPrimary: boolean;
  distanceM: number | null;
};

export type ProfileView = {
  name: string;
  weightKg: number | null;
  heightCm: number | null;
  birthDate: string | null;
  weightSource: string | null;
  lastStravaSyncedAt: string | null;
  gear: GearView[];
};

function revalidateProfile() {
  revalidatePath(routes.profile);
}

function toIsoDate(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

function serializeGear(row: {
  id: string;
  sport: string;
  kind: string;
  name: string;
  stravaGearId: string | null;
  isPrimary: boolean;
  distanceM: number | null;
}): GearView {
  return {
    id: row.id,
    sport: row.sport,
    kind: row.kind,
    name: row.name,
    stravaGearId: row.stravaGearId,
    isPrimary: row.isPrimary,
    distanceM: row.distanceM,
  };
}

async function unsetOtherPrimaries(
  tx: Prisma.TransactionClient,
  userId: string,
  sport: string,
  kind: string,
  exceptId?: string,
) {
  await tx.gear.updateMany({
    where: {
      userId,
      sport,
      kind,
      isPrimary: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { isPrimary: false },
  });
}

export async function getProfile(): Promise<ProfileView> {
  const user = await requireUser();
  const existing = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });
  const profile =
    existing ??
    (await prisma.userProfile.create({
      data: { userId: user.id },
    }));
  const gear = await prisma.gear.findMany({
    where: { userId: user.id },
    orderBy: [{ sport: "asc" }, { kind: "asc" }, { createdAt: "asc" }],
  });

  return {
    name: user.name ?? "Atleta",
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    birthDate: toIsoDate(profile.birthDate),
    weightSource: profile.weightSource,
    lastStravaSyncedAt: profile.lastStravaSyncedAt?.toISOString() ?? null,
    gear: gear.map(serializeGear),
  };
}

export async function updateProfile(
  formData: FormData,
): Promise<ProfileActionResult> {
  const user = await requireUser();
  const parsed = updateProfileFormSchema.safeParse({
    weightKg: formData.get("weightKg"),
    heightCm: formData.get("heightCm"),
    birthDate: formData.get("birthDate"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  const weightKg = parsed.data.weightKg ?? null;
  const heightCm = parsed.data.heightCm ?? null;
  const birthDate = parsed.data.birthDate
    ? new Date(`${parsed.data.birthDate}T00:00:00.000Z`)
    : null;
  const weightSource = weightKg == null ? null : WEIGHT_SOURCE.manual;

  try {
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        weightKg,
        heightCm,
        birthDate,
        weightSource,
      },
      update: {
        weightKg,
        heightCm,
        birthDate,
        weightSource,
      },
    });
    revalidateProfile();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toUserFacingError(error, USER_FACING_ERROR.profileSave),
    };
  }
}

export async function createGear(
  formData: FormData,
): Promise<ProfileActionResult> {
  const user = await requireUser();
  const parsed = createGearFormSchema.safeParse({
    sport: formData.get("sport"),
    kind: formData.get("kind"),
    name: formData.get("name"),
    isPrimary: formData.get("isPrimary"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.isPrimary) {
        await unsetOtherPrimaries(
          tx,
          user.id,
          parsed.data.sport,
          parsed.data.kind,
        );
      }
      await tx.gear.create({
        data: {
          userId: user.id,
          sport: parsed.data.sport,
          kind: parsed.data.kind,
          name: parsed.data.name,
          isPrimary: parsed.data.isPrimary,
        },
      });
    });
    revalidateProfile();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toUserFacingError(error, USER_FACING_ERROR.gearSave),
    };
  }
}

export async function updateGear(
  formData: FormData,
): Promise<ProfileActionResult> {
  const user = await requireUser();
  const parsed = updateGearFormSchema.safeParse({
    gearId: formData.get("gearId"),
    sport: formData.get("sport"),
    kind: formData.get("kind"),
    name: formData.get("name"),
    isPrimary: formData.get("isPrimary"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  try {
    const existing = await prisma.gear.findFirst({
      where: { id: parsed.data.gearId, userId: user.id },
    });
    if (!existing) {
      return { ok: false, error: "Attrezzatura non trovata" };
    }

    const sport = existing.stravaGearId ? existing.sport : parsed.data.sport;
    const kind = existing.stravaGearId ? existing.kind : parsed.data.kind;

    await prisma.$transaction(async (tx) => {
      if (parsed.data.isPrimary) {
        await unsetOtherPrimaries(tx, user.id, sport, kind, existing.id);
      }
      await tx.gear.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          isPrimary: parsed.data.isPrimary,
          sport,
          kind,
        },
      });
    });
    revalidateProfile();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toUserFacingError(error, USER_FACING_ERROR.gearSave),
    };
  }
}

export async function deleteGear(
  formData: FormData,
): Promise<ProfileActionResult> {
  const user = await requireUser();
  const parsed = gearIdFormSchema.safeParse({
    gearId: formData.get("gearId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Attrezzatura non trovata" };
  }

  try {
    const existing = await prisma.gear.findFirst({
      where: { id: parsed.data.gearId, userId: user.id },
    });
    if (!existing) {
      return { ok: false, error: "Attrezzatura non trovata" };
    }
    await prisma.gear.delete({ where: { id: existing.id } });
    revalidateProfile();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toUserFacingError(error, USER_FACING_ERROR.gearSave),
    };
  }
}

export async function syncProfileFromStrava(): Promise<ProfileActionResult> {
  const user = await requireUser();
  try {
    const accessToken = await getValidAccessToken(user.id);
    const payload = await fetchAthlete(accessToken);
    const athlete = stravaDetailedAthleteSchema.safeParse(payload);
    if (!athlete.success) {
      throw new StravaApiError("Profilo Strava non valido", 502);
    }
    await persistStravaAthleteProfile(user.id, athlete.data);
    revalidateProfile();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toUserFacingError(error, USER_FACING_ERROR.profileSync),
    };
  }
}
