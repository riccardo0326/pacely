"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationView,
} from "@/server/actions/notifications";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationList({
  notifications,
}: {
  notifications: NotificationView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const unread = notifications.some((item) => item.readAt === null);

  function markAll() {
    setError(null);
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function openNotification(item: NotificationView) {
    setError(null);
    if (item.readAt === null) {
      const formData = new FormData();
      formData.set("notificationId", item.id);
      await markNotificationRead(formData);
    }
    router.refresh();
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        title="Nessuna notifica"
        description="Ti avviseremo per l'allenamento del giorno e per le proposte di ricalcolo."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {unread ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={markAll}
          >
            Segna tutte come lette
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="flex flex-col gap-3">
        {notifications.map((item) => {
          const unreadItem = item.readAt === null;
          const content = (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className={unreadItem ? "font-semibold" : "font-medium"}>
                  {item.title}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {formatWhen(item.createdAt)}
                </span>
              </div>
              <p
                className={`mt-1 whitespace-pre-line text-sm ${unreadItem ? "text-foreground" : "text-muted-foreground"}`}
              >
                {item.body}
              </p>
            </>
          );

          return (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  onClick={() => void openNotification(item)}
                  className={`block rounded-xl border p-4 transition-colors hover:bg-muted/40 ${unreadItem ? "border-border bg-background" : "border-border/70 bg-muted/20"}`}
                >
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void openNotification(item)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/40 ${unreadItem ? "border-border bg-background" : "border-border/70 bg-muted/20"}`}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
