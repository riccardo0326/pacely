import Link from "next/link";
import type { ReactNode } from "react";
import { routes } from "@/lib/routes";

const NAV = [
  { href: routes.dashboard, label: "Dashboard" },
  { href: routes.programs, label: "Programmi" },
] as const;

export default function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <nav className="mx-auto flex w-full max-w-3xl items-center gap-4 px-6 py-3">
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
        </nav>
      </header>
      {children}
    </div>
  );
}
