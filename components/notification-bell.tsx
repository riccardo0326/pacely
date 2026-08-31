import Link from "next/link";
import { Bell } from "lucide-react";
import { routes } from "@/lib/routes";

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const label =
    unreadCount > 0 ? `Notifiche, ${unreadCount} non lette` : "Notifiche";

  return (
    <Link
      href={routes.notifications}
      className="relative ml-auto inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={label}
    >
      <Bell className="size-4" aria-hidden />
      {unreadCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
