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

const stravaId = z
  .union([z.string(), z.number()])
  .transform((id) => String(id));

export const stravaActivityPayloadSchema = z.object({
  id: stravaId,
  name: z.string().optional().nullable(),
  distance: z.number().optional().nullable(),
  moving_time: z.number().optional().nullable(),
  elapsed_time: z.number().optional().nullable(),
  total_elevation_gain: z.number().optional().nullable(),
  type: z.string().optional().nullable(),
  sport_type: z.string().optional().nullable(),
  start_date: z.string().min(1),
  average_speed: z.number().optional().nullable(),
  average_heartrate: z.number().optional().nullable(),
  max_heartrate: z.number().optional().nullable(),
  average_cadence: z.number().optional().nullable(),
  average_watts: z.number().optional().nullable(),
  weighted_average_watts: z.number().optional().nullable(),
  perceived_exertion: z.number().optional().nullable(),
  splits_metric: z.unknown().optional(),
});

export const stravaWebhookEventSchema = z.object({
  object_type: z.string(),
  object_id: stravaId,
  aspect_type: z.enum(["create", "update", "delete"]),
  owner_id: stravaId,
  subscription_id: z.number().optional(),
  event_time: z.number().optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
});

export const backfillProgressSchema = z.object({
  page: z.number().int().positive(),
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  rateLimitedUntil: z.string().optional(),
});

export type StravaActivityPayload = z.infer<typeof stravaActivityPayloadSchema>;
export type StravaWebhookEvent = z.infer<typeof stravaWebhookEventSchema>;
export type BackfillProgress = z.infer<typeof backfillProgressSchema>;

export const defaultBackfillProgress = (): BackfillProgress => ({
  page: 1,
  imported: 0,
  skipped: 0,
});
