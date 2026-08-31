import Link from "next/link";
import { CalendarView } from "@/components/calendar-view";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { routes } from "@/lib/routes";
import { getCalendarData } from "@/server/actions/calendar";

type CalendarPageProps = {
  searchParams: Promise<{ view?: string; date?: string }>;
};

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  await requireUser();
  const params = await searchParams;
  const data = await getCalendarData(params.view, params.date);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Calendario
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Pianificato vs effettivo
        </h1>
        <p className="mt-2 text-muted-foreground">
          Allenamenti dei programmi attivi, abbinati alle attività Strava dello
          stesso giorno e sport.
        </p>
      </div>

      <CalendarView data={data} />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={routes.programs}>Programmi</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.dashboard}>Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
