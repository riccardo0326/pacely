import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatDayLabel,
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

function pillClass(active: boolean): string {
  return cn(
    "rounded-md px-2.5 py-1.5 text-sm",
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:text-foreground",
  );
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
  const viewingToday = view === "day" && focus === today;
  const title =
    view === "day"
      ? formatDayLabel(focusDate)
      : view === "week"
        ? formatWeekRangeLabel(rangeStart, rangeEnd)
        : formatMonthLabel(focusDate);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Link
          href={calendarHref(view, prev)}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted sm:size-9"
          aria-label="Periodo precedente"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h2 className="min-w-0 text-base font-semibold capitalize sm:text-lg">
          {title}
        </h2>
        <Link
          href={calendarHref(view, next)}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted sm:size-9"
          aria-label="Periodo successivo"
        >
          <ChevronRight className="size-5" />
        </Link>
      </div>
      <div className="flex flex-wrap rounded-lg border border-border bg-card p-0.5">
        <Link
          href={calendarHref("day", today)}
          className={pillClass(viewingToday)}
        >
          Oggi
        </Link>
        <Link
          href={calendarHref("day", focus)}
          className={pillClass(view === "day" && !viewingToday)}
        >
          Giorno
        </Link>
        <Link
          href={calendarHref("week", focus)}
          className={pillClass(view === "week")}
        >
          Settimana
        </Link>
        <Link
          href={calendarHref("month", focus)}
          className={pillClass(view === "month")}
        >
          Mese
        </Link>
      </div>
    </div>
  );
}
