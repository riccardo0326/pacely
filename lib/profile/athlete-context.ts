import { sportSchema, type AthleteContext } from "@/lib/llm/schemas";
import { ageYearsFromBirthDate } from "@/lib/profile/age";
import { isGearKind } from "@/lib/profile/constants";

export function buildAthleteContext(input: {
  weightKg?: number | null;
  heightCm?: number | null;
  birthDate?: Date | null;
  now?: Date;
  gear: Array<{
    sport: string;
    kind: string;
    name: string;
    isPrimary: boolean;
  }>;
}): AthleteContext | undefined {
  const ageYears = input.birthDate
    ? ageYearsFromBirthDate(input.birthDate, input.now)
    : undefined;
  const gear = input.gear.flatMap((item) => {
    const sport = sportSchema.safeParse(item.sport);
    if (!sport.success || !isGearKind(item.kind) || !item.name.trim()) {
      return [];
    }
    return [
      {
        sport: sport.data,
        kind: item.kind,
        name: item.name.trim(),
        isPrimary: item.isPrimary,
      },
    ];
  });

  const context: AthleteContext = {};
  if (typeof input.weightKg === "number") {
    context.weightKg = input.weightKg;
  }
  if (typeof input.heightCm === "number") {
    context.heightCm = input.heightCm;
  }
  if (typeof ageYears === "number") {
    context.ageYears = ageYears;
  }
  if (gear.length > 0) {
    context.gear = gear;
  }

  return Object.keys(context).length > 0 ? context : undefined;
}
