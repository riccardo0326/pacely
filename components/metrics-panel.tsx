import { IntensityZones } from "@/components/intensity-zones";
import { MetricLabel } from "@/components/metric-help";
import { MetricsPmcChart } from "@/components/metrics-pmc-chart";
import { EmptyState } from "@/components/empty-state";
import { formatPace } from "@/lib/metrics/format";
import type { PmcPoint, SportZones } from "@/lib/metrics/types";
import type { MetricTerm } from "@/lib/ui/metric-glossary";

function MetricCard({ term, value }: { term: MetricTerm; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        <MetricLabel term={term} />
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export type MetricsPanelData = {
  latest: {
    date: string;
    ctl: number;
    atl: number;
    tsb: number;
    ftp: number | null;
    vdot: number | null;
    swimThresholdPaceSecPer100m: number | null;
  } | null;
  history: PmcPoint[];
  zones: SportZones[];
};

export function MetricsPanel({ data }: { data: MetricsPanelData }) {
  if (!data.latest) {
    return (
      <EmptyState
        className="text-left"
        title="Carico e forma"
        description="Le metriche appariranno dopo la prima attività di corsa, nuoto o ciclismo."
      />
    );
  }

  const { latest, history, zones } = data;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Carico e forma</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MetricCard term="ctl" value={latest.ctl.toFixed(0)} />
          <MetricCard term="atl" value={latest.atl.toFixed(0)} />
          <MetricCard
            term="tsb"
            value={`${latest.tsb >= 0 ? "+" : ""}${latest.tsb.toFixed(0)}`}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetricCard
            term="ftp"
            value={latest.ftp === null ? "—" : `${Math.round(latest.ftp)} W`}
          />
          <MetricCard
            term="vdot"
            value={latest.vdot === null ? "—" : latest.vdot.toFixed(1)}
          />
          <MetricCard
            term="swimThreshold"
            value={
              latest.swimThresholdPaceSecPer100m === null
                ? "—"
                : `${formatPace(latest.swimThresholdPaceSecPer100m)} /100m`
            }
          />
        </div>
        <div className="mt-4">
          <MetricsPmcChart points={history} />
        </div>
      </section>
      <IntensityZones zones={zones} />
    </div>
  );
}
