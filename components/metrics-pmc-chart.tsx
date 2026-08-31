import type { PmcPoint } from "@/lib/metrics/types";

type Series = {
  key: "ctl" | "atl" | "tsb";
  label: string;
  color: string;
};

const SERIES: Series[] = [
  { key: "ctl", label: "CTL", color: "var(--chart-1)" },
  { key: "atl", label: "ATL", color: "var(--chart-2)" },
  { key: "tsb", label: "TSB", color: "var(--chart-3)" },
];

function polyline(
  points: PmcPoint[],
  key: Series["key"],
  width: number,
  height: number,
  pad: number,
  minY: number,
  maxY: number,
): string {
  if (points.length === 0) {
    return "";
  }
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const range = maxY - minY || 1;
  return points
    .map((point, index) => {
      const x =
        pad +
        (points.length === 1
          ? innerW / 2
          : (index / (points.length - 1)) * innerW);
      const y = pad + innerH - ((point[key] - minY) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function MetricsPmcChart({ points }: { points: PmcPoint[] }) {
  if (points.length === 0) {
    return null;
  }

  const width = 640;
  const height = 200;
  const pad = 16;
  const values = points.flatMap((point) => [point.ctl, point.atl, point.tsb]);
  const minY = Math.min(0, ...values);
  const maxY = Math.max(...values, 1);

  return (
    <figure className="w-full">
      <svg
        role="img"
        aria-label="Andamento CTL, ATL e TSB"
        viewBox={`0 0 ${width} ${height}`}
        className="h-48 w-full"
      >
        <line
          x1={pad}
          x2={width - pad}
          y1={pad + ((height - pad * 2) * (maxY - 0)) / (maxY - minY || 1)}
          y2={pad + ((height - pad * 2) * (maxY - 0)) / (maxY - minY || 1)}
          stroke="currentColor"
          strokeOpacity={0.15}
        />
        {SERIES.map((series) => (
          <polyline
            key={series.key}
            fill="none"
            stroke={series.color}
            strokeWidth={2}
            points={polyline(
              points,
              series.key,
              width,
              height,
              pad,
              minY,
              maxY,
            )}
          />
        ))}
      </svg>
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
    </figure>
  );
}
