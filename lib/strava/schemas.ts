import { z } from "zod";

export const stravaAthleteSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((id) => String(id)),
  firstname: z.string().optional().default(""),
  lastname: z.string().optional().default(""),
  profile: z.string().nullable().optional(),
});

export const stravaTokenResponseSchema = z.object({
  token_type: z.string().optional(),
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().int(),
  expires_in: z.number().optional(),
  athlete: stravaAthleteSchema.optional(),
});

export type StravaAthlete = z.infer<typeof stravaAthleteSchema>;
export type StravaTokenResponse = z.infer<typeof stravaTokenResponseSchema>;
