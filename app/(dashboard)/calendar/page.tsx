import { CalendarView } from "@/components/calendar-view";
import { PageHeader } from "@/components/page-header";
import { RecalcProposalList } from "@/components/recalc-proposal-card";
import { requireUser } from "@/lib/auth/require-user";
import { getCalendarData } from "@/server/actions/calendar";
import { listPendingRecalcProposals } from "@/server/actions/feedback";

type CalendarPageProps = {
  searchParams: Promise<{ view?: string; date?: string }>;
};

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  await requireUser();
  const params = await searchParams;
  const [data, proposals] = await Promise.all([
    getCalendarData(params.view, params.date),
    listPendingRecalcProposals(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <PageHeader
        title="Pianificato vs effettivo"
        description="Allenamenti del piano, accanto a quello che hai fatto su Strava."
      />

      <RecalcProposalList proposals={proposals} showProgramLink />

      <CalendarView data={data} />
    </main>
  );
}
