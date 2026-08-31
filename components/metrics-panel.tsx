import { MetricsPmcChart } from "@/components/metrics-pmc-chart";
import { formatPace, formatZoneBound } from "@/lib/metrics/format";
import type { IntensityZone, PmcPoint, SportZones } from "@/lib/metrics/types";

const SPORT_LABEL: Record<string, string> = {
  run: "Corsa",
  swim: "Nuoto",
  ride: "Ciclismo",
};

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
    <div className="rounded-lg border border-border px-3 py-3">
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
      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="font-medium">Carico e forma</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le metriche appariranno quando avrai almeno un&apos;attività importata
          da Strava.
        </p>
      </section>
    );
  }

  const { latest, history, zones } = data;

  return (
    <section className="rounded-xl border border-border bg-background p-4">
      <h2 className="font-medium">Carico e forma</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        CTL (42 giorni), ATL (7 giorni) e TSB aggregati su corsa, bici e nuoto.
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
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-medium">Zone di intensità</h3>
          {zones.map((group) => (
            <div key={`${group.sport}-${group.metric}`}>
              <p className="text-xs text-muted-foreground">
                {SPORT_LABEL[group.sport] ?? group.sport} · {group.metric}
              </p>
              <ul className="mt-1 grid gap-1 text-sm">
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
