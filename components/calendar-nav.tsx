import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatMonthLabel,
  formatWeekRangeLabel,
  parseFocusDate,
  shiftFocus,
  type CalendarView,
} from "@/lib/calendar/range";
import { utcDateKey } from "@/lib/metrics/dates";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

function calendarHref(view: CalendarView, date: string): string {
  return `${routes.calendar}?view=${view}&date=${date}`;
}

export function CalendarNav({
  view,
  focus,
  rangeStart,
  rangeEnd,
}: {
  view: CalendarView;
  focus: string;
  rangeStart: string;
  rangeEnd: string;
}) {
  const focusDate = parseFocusDate(focus);
  const prev = utcDateKey(shiftFocus(view, focusDate, -1));
  const next = utcDateKey(shiftFocus(view, focusDate, 1));
  const today = utcDateKey(new Date());
  const title =
    view === "week"
      ? formatWeekRangeLabel(rangeStart, rangeEnd)
      : formatMonthLabel(focusDate);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Link
          href={calendarHref(view, prev)}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted"
          aria-label="Periodo precedente"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h2 className="min-w-0 text-lg font-semibold capitalize">{title}</h2>
        <Link
          href={calendarHref(view, next)}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted"
          aria-label="Periodo successivo"
        >
          <ChevronRight className="size-5" />
        </Link>
      </div>
      <div className="flex rounded-lg border border-border bg-card p-0.5">
        <Link
          href={calendarHref(view, today)}
          className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Oggi
        </Link>
        {(["week", "month"] as const).map((option) => (
          <Link
            key={option}
            href={calendarHref(option, focus)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm",
              view === option
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option === "week" ? "Settimana" : "Mese"}
          </Link>
        ))}
      </div>
    </div>
  );
}
