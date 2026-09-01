"use client";

import { useMemo, useState, type MouseEvent } from "react";
import type { PmcPoint } from "@/lib/metrics/types";
import {
  PMC_CHART_HEIGHT,
  PMC_CHART_WIDTH,
  PMC_PAD,
  clientXToIndex,
  formatPmcDate,
  pmcXTickIndexes,
  pmcYDomain,
  pmcYTicks,
  pointX,
  pointY,
  type PmcChartPoint,
} from "@/lib/ui/pmc-chart";
import { PMC_CSS } from "@/lib/ui/theme";

type Series = {
  key: "ctl" | "atl" | "tsb";
  label: string;
  color: string;
};

const SERIES: Series[] = [
  { key: "ctl", label: "CTL", color: PMC_CSS.ctl },
  { key: "atl", label: "ATL", color: PMC_CSS.atl },
  { key: "tsb", label: "TSB", color: PMC_CSS.tsb },
];

function polyline(
  points: PmcChartPoint[],
  key: Series["key"],
  minY: number,
  maxY: number,
): string {
  return points
    .map((point, index) => {
      const x = pointX(index, points.length);
      const y = pointY(point[key], minY, maxY);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function MetricsPmcChart({ points }: { points: PmcPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartPoints = useMemo<PmcChartPoint[]>(
    () =>
      points.map((point) => ({
        date: point.date,
        ctl: point.ctl,
        atl: point.atl,
        tsb: point.tsb,
      })),
    [points],
  );

  if (chartPoints.length === 0) {
    return null;
  }

  const { minY, maxY } = pmcYDomain(chartPoints);
  const yTicks = pmcYTicks(minY, maxY);
  const xTicks = pmcXTickIndexes(chartPoints.length);
  const zeroY = pointY(0, minY, maxY);
  const active = hoverIndex === null ? null : chartPoints[hoverIndex];

  function handleMove(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverIndex(clientXToIndex(event.clientX, rect, chartPoints.length));
  }

  return (
    <figure className="w-full">
      <p className="mb-2 text-sm font-medium">
        Andamento carico e forma (ultimi 90 giorni)
      </p>
      <svg
        role="img"
        aria-label="Andamento CTL, ATL e TSB negli ultimi 90 giorni"
        viewBox={`0 0 ${PMC_CHART_WIDTH} ${PMC_CHART_HEIGHT}`}
        className="h-56 w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((tick) => {
          const y = pointY(tick, minY, maxY);
          return (
            <g key={`y-${tick}`}>
              <line
                x1={PMC_PAD.left}
                x2={PMC_CHART_WIDTH - PMC_PAD.right}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={tick === 0 ? 0.2 : 0.08}
              />
              <text
                x={PMC_PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {tick}
              </text>
            </g>
          );
        })}
        {xTicks.map((index) => {
          const point = chartPoints[index];
          if (!point) {
            return null;
          }
          return (
            <text
              key={`x-${index}`}
              x={pointX(index, chartPoints.length)}
              y={PMC_CHART_HEIGHT - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatPmcDate(point.date)}
            </text>
          );
        })}
        <line
          x1={PMC_PAD.left}
          x2={PMC_CHART_WIDTH - PMC_PAD.right}
          y1={zeroY}
          y2={zeroY}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
        {SERIES.map((series) => (
          <polyline
            key={series.key}
            fill="none"
            stroke={series.color}
            strokeWidth={2}
            points={polyline(chartPoints, series.key, minY, maxY)}
          />
        ))}
        {hoverIndex !== null && active ? (
          <>
            <line
              x1={pointX(hoverIndex, chartPoints.length)}
              x2={pointX(hoverIndex, chartPoints.length)}
              y1={PMC_PAD.top}
              y2={PMC_CHART_HEIGHT - PMC_PAD.bottom}
              stroke="currentColor"
              strokeOpacity={0.25}
            />
            {SERIES.map((series) => (
              <circle
                key={series.key}
                cx={pointX(hoverIndex, chartPoints.length)}
                cy={pointY(active[series.key], minY, maxY)}
                r={3.5}
                fill={series.color}
              />
            ))}
          </>
        ) : null}
      </svg>
      {active ? (
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {formatPmcDate(active.date)} · CTL {active.ctl.toFixed(0)} · ATL{" "}
          {active.atl.toFixed(0)} · TSB {active.tsb >= 0 ? "+" : ""}
          {active.tsb.toFixed(0)}
        </p>
      ) : (
        <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {SERIES.map((series) => (
            <span key={series.key} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: series.color }}
              />
              {series.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
