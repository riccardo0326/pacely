"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/require-user";
import { getWebPushPublicKey } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { routes } from "@/lib/routes";
import {
  notificationIdFormSchema,
  pushSubscriptionInputSchema,
  relativeHrefSchema,
  storedNotificationTypeSchema,
} from "@/lib/validation/notification";

export type NotificationView = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationActionResult =
  { ok: true } | { ok: false; error: string };

function revalidateNotificationPaths() {
  revalidatePath("/", "layout");
  revalidatePath(routes.notifications);
  revalidatePath(routes.dashboard);
}

function toView(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationView {
  const href = row.href ? relativeHrefSchema.safeParse(row.href) : null;
  return {
    id: row.id,
    type: storedNotificationTypeSchema.safeParse(row.type).success
      ? row.type
      : row.type,
    title: row.title,
    body: row.body,
    href: href?.success ? href.data : null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getWebPushPublicKeyAction(): Promise<string | null> {
  await requireUser();
  return getWebPushPublicKey();
}

export async function getUnreadNotificationCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) {
    return 0;
  }
  return prisma.notification.count({
    where: { userId: session.user.id, readAt: null },
  });
}

export async function listNotifications(): Promise<NotificationView[]> {
  const user = await requireUser();
  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toView);
}

export async function markNotificationRead(
  formData: FormData,
): Promise<NotificationActionResult> {
  const user = await requireUser();
  const parsed = notificationIdFormSchema.safeParse({
    notificationId: formData.get("notificationId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Notifica non valida" };
  }

  const result = await prisma.notification.updateMany({
    where: {
      id: parsed.data.notificationId,
      userId: user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  if (result.count === 0) {
    return { ok: false, error: "Notifica non trovata" };
  }

  revalidateNotificationPaths();
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidateNotificationPaths();
  return { ok: true };
}

export async function savePushSubscription(
  input: unknown,
): Promise<NotificationActionResult> {
  const user = await requireUser();
  const parsed = pushSubscriptionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Iscrizione push non valida" };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
    update: {
      userId: user.id,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
  });

  return { ok: true };
}

export async function deletePushSubscription(
  endpoint: string,
): Promise<NotificationActionResult> {
  const user = await requireUser();
  const parsed = pushSubscriptionInputSchema
    .pick({ endpoint: true })
    .safeParse({ endpoint });
  if (!parsed.success) {
    return { ok: false, error: "Endpoint push non valido" };
  }

  await prisma.pushSubscription.deleteMany({
    where: { userId: user.id, endpoint: parsed.data.endpoint },
  });
  return { ok: true };
}
