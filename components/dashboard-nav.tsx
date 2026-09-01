"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { logout } from "@/server/actions/auth";

const NAV = [
  { href: routes.dashboard, label: "Dashboard", match: "exact" as const },
  { href: routes.calendar, label: "Calendario", match: "prefix" as const },
  { href: routes.programs, label: "Programmi", match: "prefix" as const },
  { href: routes.reports, label: "Report", match: "prefix" as const },
] as const;

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        <Link href={routes.dashboard} className="font-semibold tracking-tight">
          Pacely
        </Link>
        <span className="rounded-full bg-accent-energy/15 px-2 py-0.5 text-[10px] font-medium tracking-wide text-accent-energy uppercase">
          Beta
        </span>
        {NAV.map((item) => {
          const active = isActive(pathname, item.href, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm hover:text-foreground",
                active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={routes.feedback}
            className={cn(
              "text-sm hover:text-foreground",
              pathname === routes.feedback
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            Feedback
          </Link>
          <NotificationBell unreadCount={unreadCount} />
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Esci
            </Button>
          </form>
        </div>
      </nav>
    </header>
  );
}
