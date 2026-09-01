import { z } from "zod";
import { sportSchema } from "@/lib/llm/schemas";
import { ageYearsFromBirthDate } from "@/lib/profile/age";
import {
  AGE_YEARS_MAX,
  AGE_YEARS_MIN,
  GEAR_KIND_OPTIONS,
  GEAR_NAME_MAX,
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  WEIGHT_KG_MAX,
  WEIGHT_KG_MIN,
  isGearKindAllowed,
} from "@/lib/profile/constants";

export const gearKindSchema = z.enum(GEAR_KIND_OPTIONS);
export type GearKindInput = z.infer<typeof gearKindSchema>;

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

const optionalWeightKg = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number()
    .min(
      WEIGHT_KG_MIN,
      `Il peso deve essere tra ${WEIGHT_KG_MIN} e ${WEIGHT_KG_MAX} kg`,
    )
    .max(
      WEIGHT_KG_MAX,
      `Il peso deve essere tra ${WEIGHT_KG_MIN} e ${WEIGHT_KG_MAX} kg`,
    )
    .optional(),
);

const optionalHeightCm = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number()
    .int("L'altezza deve essere un numero intero di centimetri")
    .min(
      HEIGHT_CM_MIN,
      `L'altezza deve essere tra ${HEIGHT_CM_MIN} e ${HEIGHT_CM_MAX} cm`,
    )
    .max(
      HEIGHT_CM_MAX,
      `L'altezza deve essere tra ${HEIGHT_CM_MIN} e ${HEIGHT_CM_MAX} cm`,
    )
    .optional(),
);

const optionalBirthDate = z.preprocess(
  emptyToUndefined,
  z.iso.date().optional(),
);

export const updateProfileFormSchema = z
  .object({
    weightKg: optionalWeightKg,
    heightCm: optionalHeightCm,
    birthDate: optionalBirthDate,
  })
  .superRefine((value, ctx) => {
    if (!value.birthDate) {
      return;
    }
    const birth = new Date(`${value.birthDate}T00:00:00.000Z`);
    if (Number.isNaN(birth.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Data di nascita non valida",
        path: ["birthDate"],
      });
      return;
    }
    const age = ageYearsFromBirthDate(birth);
    if (age < AGE_YEARS_MIN || age > AGE_YEARS_MAX) {
      ctx.addIssue({
        code: "custom",
        message: `L'età deve essere tra ${AGE_YEARS_MIN} e ${AGE_YEARS_MAX} anni`,
        path: ["birthDate"],
      });
    }
  });
export type UpdateProfileForm = z.infer<typeof updateProfileFormSchema>;

const isPrimaryForm = z.preprocess((value) => {
  return value === true || value === "on" || value === "true" || value === "1";
}, z.boolean());

export const createGearFormSchema = z
  .object({
    sport: sportSchema,
    kind: gearKindSchema,
    name: z.string().trim().min(1, "Il nome è obbligatorio").max(GEAR_NAME_MAX),
    isPrimary: isPrimaryForm,
  })
  .superRefine((value, ctx) => {
    if (!isGearKindAllowed(value.sport, value.kind)) {
      ctx.addIssue({
        code: "custom",
        message: "Questo tipo di attrezzatura non è valido per lo sport scelto",
        path: ["kind"],
      });
    }
  });
export type CreateGearForm = z.infer<typeof createGearFormSchema>;

export const updateGearFormSchema = z
  .object({
    gearId: z.string().min(1),
    sport: sportSchema,
    kind: gearKindSchema,
    name: z.string().trim().min(1, "Il nome è obbligatorio").max(GEAR_NAME_MAX),
    isPrimary: isPrimaryForm,
  })
  .superRefine((value, ctx) => {
    if (!isGearKindAllowed(value.sport, value.kind)) {
      ctx.addIssue({
        code: "custom",
        message: "Questo tipo di attrezzatura non è valido per lo sport scelto",
        path: ["kind"],
      });
    }
  });
export type UpdateGearForm = z.infer<typeof updateGearFormSchema>;

export const gearIdFormSchema = z.object({
  gearId: z.string().min(1),
});
