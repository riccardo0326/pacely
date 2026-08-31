import webpush from "web-push";

export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  href: string;
};

export type PushSendResult = "ok" | "gone" | "error";

export type PushSender = (
  subscription: StoredPushSubscription,
  payload: PushPayload,
) => Promise<PushSendResult>;

type WebPushErrorLike = {
  statusCode?: number;
};

function isWebPushError(error: unknown): error is WebPushErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as WebPushErrorLike).statusCode === "number"
  );
}

export function getWebPushPublicKey(): string | null {
  const key = process.env.WEB_PUSH_PUBLIC_KEY?.trim();
  return key ? key : null;
}

function getWebPushPrivateKey(): string | null {
  const key = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
  return key ? key : null;
}

export function isWebPushConfigured(): boolean {
  return Boolean(getWebPushPublicKey() && getWebPushPrivateKey());
}

function vapidSubject(): string {
  const url = process.env.NEXTAUTH_URL?.trim();
  if (url?.startsWith("https://") || url?.startsWith("http://")) {
    return url;
  }
  return "mailto:pacely@localhost";
}

function configureVapid(): boolean {
  const publicKey = getWebPushPublicKey();
  const privateKey = getWebPushPrivateKey();
  if (!publicKey || !privateKey) {
    return false;
  }
  webpush.setVapidDetails(vapidSubject(), publicKey, privateKey);
  return true;
}

export async function sendWebPush(
  subscription: StoredPushSubscription,
  payload: PushPayload,
): Promise<PushSendResult> {
  if (!configureVapid()) {
    return "error";
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    );
    return "ok";
  } catch (error) {
    if (isWebPushError(error)) {
      const status = error.statusCode;
      if (status === 404 || status === 410) {
        return "gone";
      }
    }
    console.error("web push send failed", error);
    return "error";
  }
}
