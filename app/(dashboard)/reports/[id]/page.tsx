import Link from "next/link";
import { notFound } from "next/navigation";
import { PerformanceReportView } from "@/components/performance-report-view";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { formatItalianDate } from "@/lib/programs/dates";
import { routes } from "@/lib/routes";
import { getPerformanceReport } from "@/server/actions/reports";

type ReportDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  await requireUser();
  const { id } = await params;
  const report = await getPerformanceReport(id);
  if (!report) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Report
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {formatItalianDate(report.periodStart)} –{" "}
          {formatItalianDate(report.periodEnd)}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {report.sourceLabel} ·{" "}
          {new Date(report.createdAt).toLocaleString("it-IT")}
        </p>
      </div>

      {report.content ? (
        <PerformanceReportView content={report.content} />
      ) : (
        <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
          Il contenuto di questo report non è leggibile.
        </p>
      )}

      <Button asChild variant="outline" className="self-start">
        <Link href={routes.reports}>Tutti i report</Link>
      </Button>
    </main>
  );
}
