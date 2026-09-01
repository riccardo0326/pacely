import { MetricHelp } from "@/components/metric-help";
import { SportBadge } from "@/components/sport-badge";
import { formatZoneBound } from "@/lib/metrics/format";
import type { IntensityZone, SportZones } from "@/lib/metrics/types";
import { cn } from "@/lib/utils";

const ZONE_BAR_CLASS = [
  "bg-emerald-500",
  "bg-lime-500",
  "bg-amber-400",
  "bg-orange-500",
  "bg-red-500",
] as const;

const ZONE_TEXT_CLASS = [
  "text-emerald-700 dark:text-emerald-400",
  "text-lime-700 dark:text-lime-400",
  "text-amber-700 dark:text-amber-400",
  "text-orange-700 dark:text-orange-400",
  "text-red-700 dark:text-red-400",
] as const;

function metricCaption(group: SportZones) {
  if (group.metric === "power") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        Potenza (da FTP)
        <MetricHelp term="ftp" />
      </span>
    );
  }
  if (group.metric === "hr") {
    return (
      <span className="text-xs text-muted-foreground">Frequenza cardiaca</span>
    );
  }
  if (group.sport === "run") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        Passo (da VDOT)
        <MetricHelp term="vdot" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      Passo (da soglia)
      <MetricHelp term="swimThreshold" />
    </span>
  );
}

function zoneRange(zone: IntensityZone): string {
  if (zone.max === undefined) {
    return `da ${formatZoneBound(zone.min, zone.unit)} in su`;
  }
  if (zone.min === 0) {
    return `fino a ${formatZoneBound(zone.max, zone.unit)}`;
  }
  return `${formatZoneBound(zone.min, zone.unit)} – ${formatZoneBound(zone.max, zone.unit)}`;
}

function zoneBarClass(zone: number): string {
  return ZONE_BAR_CLASS[zone - 1] ?? "bg-muted";
}

function zoneTextClass(zone: number): string {
  return ZONE_TEXT_CLASS[zone - 1] ?? "text-muted-foreground";
}

export function IntensityZones({ zones }: { zones: SportZones[] }) {
  if (zones.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-medium">Zone di intensità</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Fasce di sforzo calcolate dalle tue soglie. Z1 è facile, Z5 è il più
        intenso.
      </p>
      <div className="mt-5 space-y-5">
        {zones.map((group) => (
          <div key={`${group.sport}-${group.metric}`}>
            <div className="flex flex-wrap items-center gap-2">
              <SportBadge sport={group.sport} />
              {metricCaption(group)}
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full">
              {group.zones.map((zone) => (
                <span
                  key={zone.zone}
                  className={cn("min-w-0 flex-1", zoneBarClass(zone.zone))}
                  title={`Z${zone.zone} ${zone.label}`}
                />
              ))}
            </div>
            <ul className="mt-3 space-y-2">
              {group.zones.map((zone) => (
                <li
                  key={zone.zone}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        zoneBarClass(zone.zone),
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn("font-medium", zoneTextClass(zone.zone))}
                    >
                      Z{zone.zone}
                    </span>
                    <span>{zone.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {zoneRange(zone)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
