import Link from "next/link";
import type { ReactNode } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { routes } from "@/lib/routes";
import { getUnreadNotificationCount } from "@/server/actions/notifications";

const NAV = [
  { href: routes.dashboard, label: "Dashboard" },
  { href: routes.calendar, label: "Calendario" },
  { href: routes.programs, label: "Programmi" },
  { href: routes.reports, label: "Report" },
] as const;

export default async function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const unreadCount = await getUnreadNotificationCount();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <nav className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3">
          <Link
            href={routes.dashboard}
            className="font-semibold tracking-tight"
          >
            Pacely
          </Link>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <NotificationBell unreadCount={unreadCount} />
        </nav>
      </header>
      {children}
    </div>
  );
}
