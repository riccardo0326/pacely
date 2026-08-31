/**
 * Jack Daniels VDOT from a performance (distance + time).
 * VO2 and %VO2max equations: Daniels, *Daniels' Running Formula*.
 */
export function vdotFromPerformance(
  distanceM: number,
  durationSec: number,
): number | null {
  if (distanceM <= 0 || durationSec <= 0) {
    return null;
  }
  const timeMin = durationSec / 60;
  const velocityMPerMin = distanceM / timeMin;
  const vo2 =
    -4.6 + 0.182258 * velocityMPerMin + 0.000104 * velocityMPerMin ** 2;
  const percentVo2 =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMin) +
    0.2989558 * Math.exp(-0.1932605 * timeMin);
  if (percentVo2 <= 0 || vo2 <= 0) {
    return null;
  }
  return vo2 / percentVo2;
}

/** Invert the Daniels VO2(velocity) quadratic; `vo2` is ml/kg/min. */
export function velocityMPerMinFromVo2(vo2: number): number {
  const a = 0.000104;
  const b = 0.182258;
  const c = -(vo2 + 4.6);
  const discriminant = b * b - 4 * a * c;
  return (-b + Math.sqrt(discriminant)) / (2 * a);
}

/**
 * Lactate-threshold running speed (T-pace): velocity at ~60 min effort,
 * i.e. VDOT × %VO2max(60 min).
 */
export function thresholdSpeedMpsFromVdot(vdot: number): number {
  const timeMin = 60;
  const percentVo2 =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMin) +
    0.2989558 * Math.exp(-0.1932605 * timeMin);
  const velocityMPerMin = velocityMPerMinFromVo2(vdot * percentVo2);
  return velocityMPerMin / 60;
}
