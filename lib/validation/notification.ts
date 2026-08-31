import { z } from "zod";

export const relativeHrefSchema = z
  .string()
  .regex(/^\/[a-zA-Z0-9/_-]*$/, "Percorso interno non valido");

export const pushSubscriptionInputSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(1).max(512),
  auth: z.string().min(1).max(256),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInputSchema>;

export const notificationIdFormSchema = z.object({
  notificationId: z.string().min(1),
});

export const storedNotificationTypeSchema = z.enum([
  "workout_today",
  "recalc_proposal",
]);
