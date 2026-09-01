import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PerformanceReportView } from "@/components/performance-report-view";
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
      <PageHeader
        back={{ href: routes.reports, label: "Tutti i report" }}
        title={`${formatItalianDate(report.periodStart)} – ${formatItalianDate(report.periodEnd)}`}
        description={`${report.sourceLabel} · ${new Date(report.createdAt).toLocaleString("it-IT")}`}
      />

      {report.content ? (
        <PerformanceReportView
          content={report.content}
          metrics={report.metrics}
        />
      ) : (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Il contenuto di questo report non è leggibile.
        </p>
      )}
    </main>
  );
}
