import Link from "next/link";
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
  const title =
    view === "week"
      ? formatWeekRangeLabel(rangeStart, rangeEnd)
      : formatMonthLabel(focusDate);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Link
          href={calendarHref(view, prev)}
          className="rounded-lg border border-border px-2 py-1 text-sm hover:bg-muted"
        >
          ←
        </Link>
        <h2 className="min-w-0 text-lg font-semibold capitalize">{title}</h2>
        <Link
          href={calendarHref(view, next)}
          className="rounded-lg border border-border px-2 py-1 text-sm hover:bg-muted"
        >
          →
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={calendarHref(view, utcDateKey(new Date()))}
          className="rounded-lg border border-border px-2 py-1 text-sm hover:bg-muted"
        >
          Oggi
        </Link>
        <div className="flex rounded-lg border border-border p-0.5">
          {(["week", "month"] as const).map((option) => (
            <Link
              key={option}
              href={calendarHref(option, focus)}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm",
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
    </div>
  );
}
