import type { PerformanceReportOutput } from "@/lib/llm/schemas";
import type { ReportMetricStrip } from "@/lib/reports";

function formatDelta(value: number | undefined): string {
  if (value === undefined) {
    return "";
  }
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return ` (${sign}${rounded})`;
}

function MetricChip({
  label,
  value,
  change,
}: {
  label: string;
  value: number;
  change?: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">
        {label === "TSB" && value >= 0 ? "+" : ""}
        {value.toFixed(0)}
        <span className="text-sm font-normal text-muted-foreground">
          {formatDelta(change)}
        </span>
      </p>
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-medium">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function PerformanceReportView({
  content,
  metrics,
}: {
  content: PerformanceReportOutput;
  metrics: ReportMetricStrip | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      {metrics ? (
        <div className="grid grid-cols-3 gap-2">
          <MetricChip
            label="CTL"
            value={metrics.ctl}
            change={metrics.ctlChange}
          />
          <MetricChip
            label="ATL"
            value={metrics.atl}
            change={metrics.atlChange}
          />
          <MetricChip
            label="TSB"
            value={metrics.tsb}
            change={metrics.tsbChange}
          />
        </div>
      ) : null}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-medium">Sintesi</h2>
        <p className="mt-2 text-sm leading-relaxed">{content.summary}</p>
      </section>
      <ReportList title="Punti di forza" items={content.strengths} />
      <ReportList title="Aree di miglioramento" items={content.improvements} />
      <ReportList title="Suggerimenti" items={content.suggestions} />
    </div>
  );
}
