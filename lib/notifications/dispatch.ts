import { Prisma } from "@prisma/client";
import {
  NOTIFICATION_TYPE,
  type NotificationType,
} from "@/lib/notifications/constants";
import {
  buildRecalcProposalContent,
  recalcProposalDedupeKey,
} from "@/lib/notifications/content";
import {
  sendWebPush,
  type PushPayload,
  type PushSender,
  type StoredPushSubscription,
} from "@/lib/notifications/push";
import { prisma } from "@/lib/prisma";

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
  scheduledAt?: Date | null;
};

export type CreatedNotification = {
  id: string;
  created: boolean;
};

export type NotificationStore = {
  createNotification(
    input: CreateNotificationInput,
  ): Promise<CreatedNotification>;
  listPushSubscriptions(userId: string): Promise<StoredPushSubscription[]>;
  deletePushSubscription(id: string): Promise<void>;
};

export const prismaNotificationStore: NotificationStore = {
  async createNotification(input) {
    try {
      const row = await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          href: input.href,
          dedupeKey: input.dedupeKey,
          scheduledAt: input.scheduledAt ?? null,
        },
        select: { id: true },
      });
      return { id: row.id, created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await prisma.notification.findUnique({
          where: {
            userId_dedupeKey: {
              userId: input.userId,
              dedupeKey: input.dedupeKey,
            },
          },
          select: { id: true },
        });
        return { id: existing?.id ?? "", created: false };
      }
      throw error;
    }
  },

  async listPushSubscriptions(userId) {
    return prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
  },

  async deletePushSubscription(id) {
    await prisma.pushSubscription.deleteMany({ where: { id } });
  },
};

export type DispatchResult = {
  notificationId: string;
  created: boolean;
  pushesSent: number;
  pushesGone: number;
  pushesFailed: number;
};

export async function createAndDispatchNotification(
  input: CreateNotificationInput,
  deps: {
    store?: NotificationStore;
    sendPush?: PushSender;
  } = {},
): Promise<DispatchResult> {
  const store = deps.store ?? prismaNotificationStore;
  const sendPush = deps.sendPush ?? sendWebPush;

  const saved = await store.createNotification(input);
  const payload: PushPayload = {
    title: input.title,
    body: input.body,
    href: input.href,
  };

  let pushesSent = 0;
  let pushesGone = 0;
  let pushesFailed = 0;

  if (saved.created) {
    const subscriptions = await store.listPushSubscriptions(input.userId);
    for (const subscription of subscriptions) {
      const result = await sendPush(subscription, payload);
      if (result === "ok") {
        pushesSent += 1;
      } else if (result === "gone") {
        pushesGone += 1;
        await store.deletePushSubscription(subscription.id);
      } else {
        pushesFailed += 1;
      }
    }
  }

  return {
    notificationId: saved.id,
    created: saved.created,
    pushesSent,
    pushesGone,
    pushesFailed,
  };
}

export async function notifyRecalcProposal(
  input: {
    userId: string;
    programId: string;
    proposalId: string;
    programName?: string;
  },
  deps: {
    store?: NotificationStore;
    sendPush?: PushSender;
  } = {},
): Promise<DispatchResult> {
  const content = buildRecalcProposalContent({
    programId: input.programId,
    programName: input.programName,
  });
  return createAndDispatchNotification(
    {
      userId: input.userId,
      type: NOTIFICATION_TYPE.recalcProposal,
      title: content.title,
      body: content.body,
      href: content.href,
      dedupeKey: recalcProposalDedupeKey(input.proposalId),
    },
    deps,
  );
}
