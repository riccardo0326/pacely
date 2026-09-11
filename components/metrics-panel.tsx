import { TriangleAlert } from "lucide-react";
import { IntensityZones } from "@/components/intensity-zones";
import { MetricLabel } from "@/components/metric-help";
import { MetricsPmcChart } from "@/components/metrics-pmc-chart";
import { EmptyState } from "@/components/empty-state";
import { addUtcDays } from "@/lib/metrics/dates";
import { formatPace } from "@/lib/metrics/format";
import {
  KPI_ALERT_HINT,
  atlAlertLevel,
  ctlAlertLevel,
  tsbAlertLevel,
  type KpiAlertLevel,
} from "@/lib/metrics/kpi-status";
import type { PmcPoint, SportZones } from "@/lib/metrics/types";
import { METRIC_GLOSSARY, type MetricTerm } from "@/lib/ui/metric-glossary";
import { cn } from "@/lib/utils";

const STATUS_CARD: Record<KpiAlertLevel, string> = {
  ok: "border-emerald-600/20 bg-emerald-500/[0.08]",
  watch: "border-amber-600/25 bg-amber-500/[0.10]",
  alert: "border-red-600/25 bg-red-500/[0.10]",
};

const STATUS_HINT: Record<KpiAlertLevel, string> = {
  ok: "text-emerald-800/70 dark:text-emerald-300/65",
  watch: "text-amber-900/70 dark:text-amber-200/70",
  alert: "text-red-800/75 dark:text-red-300/70",
};

function ctlFromWeekAgo(
  history: PmcPoint[],
  latestDate: string,
): number | null {
  const target = addUtcDays(latestDate, -7);
  const exact = history.find((point) => point.date === target);
  if (exact) {
    return exact.ctl;
  }
  const older = [...history].reverse().find((point) => point.date <= target);
  return older?.ctl ?? null;
}

function MetricCard({
  term,
  value,
  status,
}: {
  term: MetricTerm;
  value: string;
  status?: KpiAlertLevel;
}) {
  const entry = METRIC_GLOSSARY[term];
  return (
    <div
      className={cn(
        "relative rounded-lg border px-3 py-3",
        status ? STATUS_CARD[status] : "border-border bg-card",
      )}
    >
      {status === "alert" ? (
        <TriangleAlert
          className="absolute top-2.5 right-2.5 size-3.5 text-red-600/50 dark:text-red-400/55"
          aria-label="Allerta"
        />
      ) : null}
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        <MetricLabel term={term} />
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        {entry.title}
      </p>
      {status ? (
        <p
          className={cn(
            "mt-0.5 text-[10px] font-medium leading-snug",
            STATUS_HINT[status],
          )}
        >
          {KPI_ALERT_HINT[status]}
        </p>
      ) : null}
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
  const ctlWeekAgo = ctlFromWeekAgo(history, latest.date);
  const ctlStatus = ctlAlertLevel(latest.ctl, ctlWeekAgo);
  const atlStatus = atlAlertLevel(latest.atl, latest.ctl);
  const tsbStatus = tsbAlertLevel(latest.tsb);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Carico e forma</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MetricCard
            term="ctl"
            value={latest.ctl.toFixed(0)}
            status={ctlStatus}
          />
          <MetricCard
            term="atl"
            value={latest.atl.toFixed(0)}
            status={atlStatus}
          />
          <MetricCard
            term="tsb"
            value={`${latest.tsb >= 0 ? "+" : ""}${latest.tsb.toFixed(0)}`}
            status={tsbStatus}
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
