/**
 * PMC traffic-light for dashboard KPIs (TrainingPeaks-style bands).
 * TSB = CTL − ATL. Negative TSB = more fatigue than fitness.
 */
export const KPI_TSB_ALERT = -30;
export const KPI_TSB_WATCH_LOW = -10;
export const KPI_TSB_WATCH_HIGH = 25;

/** ATL / CTL: 1.3 ≈ TSB about −30% of CTL. */
export const KPI_ATL_RATIO_ALERT = 1.3;
export const KPI_ATL_RATIO_WATCH = 1.05;

/** CTL should not jump more than ~5–8 TSS/week. */
export const KPI_CTL_WEEK_ALERT = 8;
export const KPI_CTL_WEEK_WATCH_UP = 5;
export const KPI_CTL_WEEK_WATCH_DOWN = -4;

export type KpiAlertLevel = "ok" | "watch" | "alert";

export function tsbAlertLevel(tsb: number): KpiAlertLevel {
  if (tsb <= KPI_TSB_ALERT) {
    return "alert";
  }
  if (tsb < KPI_TSB_WATCH_LOW || tsb > KPI_TSB_WATCH_HIGH) {
    return "watch";
  }
  return "ok";
}

export function atlAlertLevel(atl: number, ctl: number): KpiAlertLevel {
  if (ctl <= 0) {
    if (atl >= 80) {
      return "alert";
    }
    if (atl >= 50) {
      return "watch";
    }
    return "ok";
  }
  const ratio = atl / ctl;
  if (ratio >= KPI_ATL_RATIO_ALERT) {
    return "alert";
  }
  if (ratio > KPI_ATL_RATIO_WATCH) {
    return "watch";
  }
  return "ok";
}

export function ctlAlertLevel(
  ctl: number,
  ctlWeekAgo: number | null,
): KpiAlertLevel {
  if (ctlWeekAgo === null) {
    return "ok";
  }
  const delta = ctl - ctlWeekAgo;
  if (delta >= KPI_CTL_WEEK_ALERT || delta <= -KPI_CTL_WEEK_ALERT) {
    return "alert";
  }
  if (delta >= KPI_CTL_WEEK_WATCH_UP || delta <= KPI_CTL_WEEK_WATCH_DOWN) {
    return "watch";
  }
  return "ok";
}

export const KPI_ALERT_HINT: Record<KpiAlertLevel, string> = {
  ok: "Nella norma",
  watch: "Attenzione questa settimana",
  alert: "Allerta: riduci il carico",
};
