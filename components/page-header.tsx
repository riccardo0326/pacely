import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {back.label}
          </Link>
        ) : null}
        <h1
          className={cn(
            "text-3xl font-semibold tracking-tight",
            back ? "mt-2" : null,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-start gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
