"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
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
  { href: routes.profile, label: "Profilo", match: "prefix" as const },
] as const;

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  onNavigate,
  className,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {NAV.map((item) => {
        const active = isActive(pathname, item.href, item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "text-sm hover:text-foreground",
              active ? "font-medium text-foreground" : "text-muted-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function DashboardNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border bg-card">
      <nav className="mx-auto flex w-full max-w-5xl flex-col px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href={routes.dashboard}
            className="font-semibold tracking-tight"
            onClick={() => setOpen(false)}
          >
            Pacely
          </Link>
          <span className="rounded-full bg-accent-energy/15 px-2 py-0.5 text-[10px] font-medium tracking-wide text-accent-energy uppercase">
            Beta
          </span>
          <NavLinks
            pathname={pathname}
            className="hidden items-center gap-4 md:flex"
          />
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell unreadCount={unreadCount} />
            <form action={logout} className="hidden md:block">
              <Button type="submit" variant="ghost" size="sm">
                Esci
              </Button>
            </form>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Chiudi menu" : "Apri menu"}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>
        {open ? (
          <div
            id="mobile-nav"
            className="mt-3 flex flex-col gap-3 border-t border-border pt-3 md:hidden"
          >
            <NavLinks
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              className="flex flex-col gap-3"
            />
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Esci
              </Button>
            </form>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
