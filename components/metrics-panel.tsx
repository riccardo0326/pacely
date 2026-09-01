import { MetricsPmcChart } from "@/components/metrics-pmc-chart";
import { EmptyState } from "@/components/empty-state";
import { SportBadge } from "@/components/sport-badge";
import { formatPace, formatZoneBound } from "@/lib/metrics/format";
import type { IntensityZone, PmcPoint, SportZones } from "@/lib/metrics/types";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function zoneRange(zone: IntensityZone): string {
  if (zone.max === undefined) {
    return `≥ ${formatZoneBound(zone.min, zone.unit)}`;
  }
  if (zone.min === 0) {
    return `< ${formatZoneBound(zone.max, zone.unit)}`;
  }
  return `${formatZoneBound(zone.min, zone.unit)} – ${formatZoneBound(zone.max, zone.unit)}`;
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
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-medium">Carico e forma</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        CTL, ATL e TSB su corsa, bici e nuoto.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MetricCard
          label="CTL"
          value={latest.ctl.toFixed(0)}
          hint="Carico cronico"
        />
        <MetricCard
          label="ATL"
          value={latest.atl.toFixed(0)}
          hint="Carico acuto"
        />
        <MetricCard
          label="TSB"
          value={`${latest.tsb >= 0 ? "+" : ""}${latest.tsb.toFixed(0)}`}
          hint="Forma (CTL − ATL)"
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricCard
          label="FTP"
          value={latest.ftp === null ? "—" : `${Math.round(latest.ftp)} W`}
          hint="Ciclismo"
        />
        <MetricCard
          label="VDOT"
          value={latest.vdot === null ? "—" : latest.vdot.toFixed(1)}
          hint="Corsa"
        />
        <MetricCard
          label="Soglia nuoto"
          value={
            latest.swimThresholdPaceSecPer100m === null
              ? "—"
              : `${formatPace(latest.swimThresholdPaceSecPer100m)} /100m`
          }
          hint="Passo CSS"
        />
      </div>
      <div className="mt-4">
        <MetricsPmcChart points={history} />
      </div>
      {zones.length > 0 ? (
        <div className="mt-5 space-y-4">
          <h3 className="text-sm font-medium">Zone di intensità</h3>
          {zones.map((group) => (
            <div key={`${group.sport}-${group.metric}`}>
              <div className="flex items-center gap-2">
                <SportBadge sport={group.sport} />
                <p className="text-xs text-muted-foreground">{group.metric}</p>
              </div>
              <ul className="mt-2 grid gap-1.5 text-sm leading-relaxed">
                {group.zones.map((zone) => (
                  <li
                    key={zone.zone}
                    className="flex justify-between gap-2 tabular-nums"
                  >
                    <span>
                      Z{zone.zone} {zone.label}
                    </span>
                    <span className="text-muted-foreground">
                      {zoneRange(zone)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
