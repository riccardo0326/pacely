"use client";

import { useId, useState } from "react";
import { METRIC_GLOSSARY, type MetricTerm } from "@/lib/ui/metric-glossary";
import { cn } from "@/lib/utils";

export function MetricHelp({
  term,
  className,
}: {
  term: MetricTerm;
  className?: string;
}) {
  const entry = METRIC_GLOSSARY[term];
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={`Cos'è ${entry.abbr}: ${entry.title}`}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        className="inline-flex size-4 items-center justify-center rounded-full border border-border text-[10px] font-medium text-muted-foreground hover:border-foreground hover:text-foreground"
      >
        ?
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute top-full left-0 z-30 mt-1 w-64 rounded-lg border border-border bg-card p-2.5 text-left text-xs font-normal normal-case tracking-normal text-foreground shadow-md"
        >
          <span className="font-medium">
            {entry.abbr} · {entry.title}
          </span>
          <span className="mt-1 block leading-relaxed text-muted-foreground">
            {entry.body}
          </span>
        </span>
      ) : null}
    </span>
  );
}

export function MetricLabel({
  term,
  className,
}: {
  term: MetricTerm;
  className?: string;
}) {
  const entry = METRIC_GLOSSARY[term];
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span>{entry.abbr}</span>
      <MetricHelp term={term} />
    </span>
  );
}
