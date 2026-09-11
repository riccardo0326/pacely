"use client";

import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Maximize2, X } from "lucide-react";
import type { PmcPoint } from "@/lib/metrics/types";
import {
  PMC_CHART_HEIGHT,
  PMC_CHART_WIDTH,
  PMC_PAD,
  PMC_WINDOW_DAYS,
  clientXToIndex,
  clampPmcOffset,
  formatPmcDate,
  formatPmcRangeLabel,
  pmcXTickIndexes,
  pmcYDomain,
  pmcYTicks,
  pointX,
  pointY,
  slicePmcWindow,
  type PmcChartPoint,
  type PmcWindowDays,
} from "@/lib/ui/pmc-chart";
import { MetricHelp } from "@/components/metric-help";
import { Button } from "@/components/ui/button";
import { PMC_CSS } from "@/lib/ui/theme";
import { cn } from "@/lib/utils";

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

function PmcSvg({
  points,
  hoverIndex,
  onHover,
  className,
  onPan,
}: {
  points: PmcChartPoint[];
  hoverIndex: number | null;
  onHover: (index: number | null) => void;
  className?: string;
  onPan?: (dayDelta: number) => void;
}) {
  const drag = useRef<{
    pointerId: number;
    startX: number;
    lastShift: number;
  } | null>(null);
  const { minY, maxY } = pmcYDomain(points);
  const yTicks = pmcYTicks(minY, maxY);
  const xTicks = pmcXTickIndexes(points.length);
  const zeroY = pointY(0, minY, maxY);
  const active = hoverIndex === null ? null : points[hoverIndex];

  function clientToIndex(clientX: number, target: SVGSVGElement) {
    return clientXToIndex(
      clientX,
      target.getBoundingClientRect(),
      points.length,
    );
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      lastShift: 0,
    };
    onHover(clientToIndex(event.clientX, event.currentTarget));
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    onHover(clientXToIndex(event.clientX, rect, points.length));
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId || !onPan) {
      return;
    }
    const pxPerDay = rect.width / Math.max(points.length, 1);
    const shift = Math.round((event.clientX - current.startX) / pxPerDay);
    if (shift !== current.lastShift) {
      onPan(shift - current.lastShift);
      current.lastShift = shift;
    }
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId === event.pointerId) {
      drag.current = null;
    }
  }

  return (
    <svg
      role="img"
      aria-label="Andamento CTL, ATL e TSB"
      viewBox={`0 0 ${PMC_CHART_WIDTH} ${PMC_CHART_HEIGHT}`}
      className={cn("h-56 w-full touch-pan-y", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => {
        if (!drag.current) {
          onHover(null);
        }
      }}
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
        const point = points[index];
        if (!point) {
          return null;
        }
        return (
          <text
            key={`x-${index}`}
            x={pointX(index, points.length)}
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
          points={polyline(points, series.key, minY, maxY)}
        />
      ))}
      {hoverIndex !== null && active ? (
        <>
          <line
            x1={pointX(hoverIndex, points.length)}
            x2={pointX(hoverIndex, points.length)}
            y1={PMC_PAD.top}
            y2={PMC_CHART_HEIGHT - PMC_PAD.bottom}
            stroke="currentColor"
            strokeOpacity={0.25}
          />
          {SERIES.map((series) => (
            <circle
              key={series.key}
              cx={pointX(hoverIndex, points.length)}
              cy={pointY(active[series.key], minY, maxY)}
              r={3.5}
              fill={series.color}
            />
          ))}
        </>
      ) : null}
    </svg>
  );
}

export function MetricsPmcChart({ points }: { points: PmcPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [windowDays, setWindowDays] = useState<PmcWindowDays>(90);
  const [offsetFromEnd, setOffsetFromEnd] = useState(0);
  const [expanded, setExpanded] = useState(false);

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

  const visible = useMemo(
    () => slicePmcWindow(chartPoints, windowDays, offsetFromEnd),
    [chartPoints, windowDays, offsetFromEnd],
  );

  if (chartPoints.length === 0) {
    return null;
  }

  const rangeLabel = formatPmcRangeLabel(visible);
  const active = hoverIndex === null ? null : visible[hoverIndex];

  function handleWindow(next: PmcWindowDays) {
    setWindowDays(next);
    setOffsetFromEnd(0);
    setHoverIndex(null);
  }

  function handlePan(dayDelta: number) {
    setOffsetFromEnd((current) =>
      clampPmcOffset(chartPoints.length, windowDays, current + dayDelta),
    );
  }

  const controls = (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <p className="text-sm font-medium">Andamento carico e forma</p>
      <div className="ml-auto flex flex-wrap items-center gap-1">
        {PMC_WINDOW_DAYS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => handleWindow(days)}
            className={cn(
              "rounded-md px-2 py-1 text-xs",
              windowDays === days
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {days}g
          </button>
        ))}
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="md:hidden"
          onClick={() => setExpanded(true)}
          aria-label="Apri grafico in grande"
        >
          <Maximize2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );

  const caption = active ? (
    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
      {formatPmcDate(active.date)} · CTL {active.ctl.toFixed(0)} · ATL{" "}
      {active.atl.toFixed(0)} · TSB {active.tsb >= 0 ? "+" : ""}
      {active.tsb.toFixed(0)}
    </p>
  ) : (
    <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>{rangeLabel}</span>
      {SERIES.map((series) => (
        <span key={series.key} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: series.color }}
          />
          {series.label}
          <MetricHelp term={series.key} />
        </span>
      ))}
    </figcaption>
  );

  return (
    <figure className="w-full">
      {controls}
      <PmcSvg
        points={visible}
        hoverIndex={hoverIndex}
        onHover={setHoverIndex}
        onPan={handlePan}
      />
      {caption}
      {expanded ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Andamento carico e forma</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(false)}
              aria-label="Chiudi grafico"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="mb-3 flex flex-wrap gap-1">
            {PMC_WINDOW_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => handleWindow(days)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm",
                  windowDays === days
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground",
                )}
              >
                {days} giorni
              </button>
            ))}
          </div>
          <PmcSvg
            points={visible}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
            onPan={handlePan}
            className="min-h-0 flex-1 h-auto"
          />
          {caption}
        </div>
      ) : null}
    </figure>
  );
}
