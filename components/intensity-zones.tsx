"use client";

import { useState } from "react";
import {
  Activity,
  Bike,
  Gauge,
  Heart,
  PersonStanding,
  WavesLadder,
  Zap,
} from "lucide-react";
import { MetricHelp } from "@/components/metric-help";
import { formatZoneBound } from "@/lib/metrics/format";
import type { IntensityZone, SportZones } from "@/lib/metrics/types";
import { cn } from "@/lib/utils";

const ZONE_METADATA: Record<
  number,
  {
    rpe: string;
    description: string;
    barColor: string;
    badgeBg: string;
    textColor: string;
    borderColor: string;
    hoverBg: string;
    activeBorder: string;
  }
> = {
  1: {
    rpe: "RPE 1–2",
    description:
      "Recupero attivo e riscaldamento. Respirazione facilissima, ritmo conversazione fluida.",
    barColor: "bg-emerald-500",
    badgeBg:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/25",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-500/20",
    hoverBg: "hover:bg-emerald-500/[0.04]",
    activeBorder:
      "border-emerald-500 bg-emerald-500/[0.07] ring-1 ring-emerald-500/40",
  },
  2: {
    rpe: "RPE 3–4",
    description:
      "Base aerobica fondamentale. Ritmo sostenibile per ore, conversazione facile.",
    barColor: "bg-lime-500",
    badgeBg:
      "bg-lime-500/15 text-lime-700 dark:text-lime-300 dark:bg-lime-500/25",
    textColor: "text-lime-700 dark:text-lime-400",
    borderColor: "border-lime-500/20",
    hoverBg: "hover:bg-lime-500/[0.04]",
    activeBorder: "border-lime-500 bg-lime-500/[0.07] ring-1 ring-lime-500/40",
  },
  3: {
    rpe: "RPE 5–6",
    description:
      "Ritmo tempo/medio. Respirazione ritmata e controllata, frasi brevi.",
    barColor: "bg-amber-400",
    badgeBg:
      "bg-amber-400/20 text-amber-800 dark:text-amber-300 dark:bg-amber-400/25",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-400/20",
    hoverBg: "hover:bg-amber-400/[0.04]",
    activeBorder:
      "border-amber-400 bg-amber-400/[0.07] ring-1 ring-amber-400/40",
  },
  4: {
    rpe: "RPE 7–8",
    description:
      "Soglia anaerobica. Sforzo duro, concentrazione elevata, poche parole.",
    barColor: "bg-orange-500",
    badgeBg:
      "bg-orange-500/15 text-orange-700 dark:text-orange-300 dark:bg-orange-500/25",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-500/20",
    hoverBg: "hover:bg-orange-500/[0.04]",
    activeBorder:
      "border-orange-500 bg-orange-500/[0.07] ring-1 ring-orange-500/40",
  },
  5: {
    rpe: "RPE 9–10",
    description:
      "VO2 max e sprint. Sforzo massimale sostenibile solo per brevi intervalli.",
    barColor: "bg-red-500",
    badgeBg: "bg-red-500/15 text-red-700 dark:text-red-300 dark:bg-red-500/25",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-500/20",
    hoverBg: "hover:bg-red-500/[0.04]",
    activeBorder: "border-red-500 bg-red-500/[0.07] ring-1 ring-red-500/40",
  },
};

function MetricIcon({ metric, sport }: { metric: string; sport: string }) {
  if (metric === "hr") {
    return <Heart className="size-3.5 text-rose-500" aria-hidden />;
  }
  if (metric === "power") {
    return <Zap className="size-3.5 text-amber-500" aria-hidden />;
  }
  if (sport === "ride") {
    return <Bike className="size-3.5" aria-hidden />;
  }
  if (sport === "swim") {
    return <WavesLadder className="size-3.5" aria-hidden />;
  }
  return <Gauge className="size-3.5 text-primary" aria-hidden />;
}

function SportIcon({ sport }: { sport: string }) {
  if (sport === "swim") {
    return <WavesLadder className="size-3.5" aria-hidden />;
  }
  if (sport === "ride") {
    return <Bike className="size-3.5" aria-hidden />;
  }
  return <PersonStanding className="size-3.5" aria-hidden />;
}

function metricTabLabel(group: SportZones): string {
  const sportName =
    group.sport === "run" ? "Corsa" : group.sport === "ride" ? "Bici" : "Nuoto";

  if (group.metric === "hr") {
    return `${sportName} · FC`;
  }
  if (group.metric === "power") {
    return `${sportName} · Potenza`;
  }
  return `${sportName} · Passo`;
}

function metricCaption(group: SportZones) {
  if (group.metric === "power") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        Potenza stimata da FTP
        <MetricHelp term="ftp" />
      </span>
    );
  }
  if (group.metric === "hr") {
    return (
      <span className="text-xs text-muted-foreground">
        Frequenza cardiaca calcolata da FC Max
      </span>
    );
  }
  if (group.sport === "run") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        Passo calcolato dal VDOT (T-Pace)
        <MetricHelp term="vdot" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      Passo calcolato dalla soglia CSS
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

export function IntensityZones({ zones }: { zones: SportZones[] }) {
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [hoveredZone, setHoveredZone] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  if (zones.length === 0) {
    return null;
  }

  const currentGroup = zones[activeGroupIndex] ?? zones[0]!;
  const focusedZoneNumber = hoveredZone ?? selectedZone;
  const focusedZone = currentGroup.zones.find(
    (z) => z.zone === focusedZoneNumber,
  );
  const focusedMeta = focusedZoneNumber
    ? ZONE_METADATA[focusedZoneNumber]
    : null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              Zone di intensità
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Activity className="size-3" /> 5 Zone
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Fasce di sforzo personalizzate calcolate sulle tue metriche e soglie
            fisiologiche.
          </p>
        </div>
      </div>

      {zones.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-1.5 border-b border-border/60 pb-3">
          {zones.map((group, index) => {
            const isSelected = index === activeGroupIndex;
            return (
              <button
                key={`${group.sport}-${group.metric}`}
                type="button"
                onClick={() => {
                  setActiveGroupIndex(index);
                  setSelectedZone(null);
                  setHoveredZone(null);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <MetricIcon metric={group.metric} sport={group.sport} />
                <span>{metricTabLabel(group)}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium capitalize">
              <SportIcon sport={currentGroup.sport} />
              {currentGroup.sport === "run"
                ? "Corsa"
                : currentGroup.sport === "ride"
                  ? "Ciclismo"
                  : "Nuoto"}
            </span>
            {metricCaption(currentGroup)}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Clicca o passa sopra una zona per i dettagli
          </p>
        </div>

        {/* Interactive Multi-Segment Bar */}
        <div className="mt-3">
          <div className="flex h-3.5 w-full gap-1 overflow-hidden rounded-full bg-muted/40 p-0.5">
            {currentGroup.zones.map((zone) => {
              const meta = ZONE_METADATA[zone.zone];
              const isFocused = focusedZoneNumber === zone.zone;
              const isAnyFocused = focusedZoneNumber !== null;
              return (
                <button
                  key={zone.zone}
                  type="button"
                  onMouseEnter={() => setHoveredZone(zone.zone)}
                  onMouseLeave={() => setHoveredZone(null)}
                  onClick={() =>
                    setSelectedZone((prev) =>
                      prev === zone.zone ? null : zone.zone,
                    )
                  }
                  className={cn(
                    "relative flex-1 rounded-full transition-all duration-200 focus:outline-hidden",
                    meta?.barColor ?? "bg-primary",
                    isFocused && "scale-y-125 shadow-xs brightness-110",
                    isAnyFocused && !isFocused && "opacity-40",
                  )}
                  title={`Z${zone.zone} ${zone.label} (${zoneRange(zone)})`}
                />
              );
            })}
          </div>

          <div className="mt-1 flex justify-between px-1 text-[10px] font-medium text-muted-foreground">
            <span>Z1 Facile</span>
            <span>Z3 Medio</span>
            <span>Z5 Massimale</span>
          </div>
        </div>

        {/* Active Zone Spotlight banner if a zone is focused */}
        {focusedZone && focusedMeta ? (
          <div
            className={cn(
              "mt-3 rounded-lg border p-2.5 transition-all animate-in fade-in-50",
              focusedMeta.activeBorder,
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex size-5 items-center justify-center rounded-full text-xs font-bold",
                    focusedMeta.badgeBg,
                  )}
                >
                  Z{focusedZone.zone}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {focusedZone.label}
                </span>
                <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {focusedMeta.rpe}
                </span>
              </div>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {zoneRange(focusedZone)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {focusedMeta.description}
            </p>
          </div>
        ) : null}

        {/* Interactive Zone Cards List */}
        <div className="mt-3 grid gap-2">
          {currentGroup.zones.map((zone) => {
            const meta = ZONE_METADATA[zone.zone];
            const isFocused = focusedZoneNumber === zone.zone;
            const isSelected = selectedZone === zone.zone;

            return (
              <div
                key={zone.zone}
                onMouseEnter={() => setHoveredZone(zone.zone)}
                onMouseLeave={() => setHoveredZone(null)}
                onClick={() =>
                  setSelectedZone((prev) =>
                    prev === zone.zone ? null : zone.zone,
                  )
                }
                className={cn(
                  "group flex cursor-pointer flex-col gap-1.5 rounded-lg border p-2.5 transition-all duration-150 sm:flex-row sm:items-center sm:justify-between",
                  isFocused || isSelected
                    ? (meta?.activeBorder ?? "border-primary bg-primary/5")
                    : cn(
                        "border-border/70 bg-card",
                        meta?.hoverBg ?? "hover:bg-muted/40",
                      ),
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-transform group-hover:scale-105",
                      meta?.badgeBg ?? "bg-muted text-foreground",
                    )}
                  >
                    Z{zone.zone}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {zone.label}
                      </span>
                      <span className="rounded-md bg-muted/60 px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                        {meta?.rpe}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {meta?.description}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 self-end sm:self-center">
                  <span className="text-sm font-bold tabular-nums tracking-tight text-foreground">
                    {zoneRange(zone)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
