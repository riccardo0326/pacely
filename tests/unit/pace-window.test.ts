import { describe, expect, it } from "vitest";
import { formatPaceWindow, paceWindowForZone } from "@/lib/metrics/pace-window";

describe("paceWindowForZone", () => {
  const thresholdMps = 1000 / 270;

  it("returns null for invalid zone or threshold", () => {
    expect(paceWindowForZone(2, 0)).toBeNull();
    expect(paceWindowForZone(0, 4)).toBeNull();
    expect(paceWindowForZone(2.5, thresholdMps)).toBeNull();
  });

  it("clamps a wide Z2 to 30 s/km and formats slower-first", () => {
    const window = paceWindowForZone(2, thresholdMps);
    expect(window).not.toBeNull();
    expect(window!.maxSecPerKm - window!.minSecPerKm).toBe(30);
    const label = formatPaceWindow(window!);
    expect(label).toMatch(/^\d+:\d{2}–\d+:\d{2} \/km$/);
    const [slower, faster] = label.replace(" /km", "").split("–");
    const toSec = (value: string) => {
      const [min, sec] = value.split(":").map(Number);
      return min * 60 + sec;
    };
    expect(toSec(slower)).toBeGreaterThan(toSec(faster));
  });

  it("keeps Z4 within 15–30 s", () => {
    const window = paceWindowForZone(4, thresholdMps);
    expect(window).not.toBeNull();
    const width = window!.maxSecPerKm - window!.minSecPerKm;
    expect(width).toBeGreaterThanOrEqual(15);
    expect(width).toBeLessThanOrEqual(30);
  });

  it("gives Z1 a 15–30 s easy window slower than the Z2 edge", () => {
    const z1 = paceWindowForZone(1, thresholdMps);
    const z2 = paceWindowForZone(2, thresholdMps);
    expect(z1).not.toBeNull();
    expect(z2).not.toBeNull();
    expect(z1!.minSecPerKm).toBeGreaterThanOrEqual(z2!.maxSecPerKm - 0.5);
    expect(z1!.maxSecPerKm - z1!.minSecPerKm).toBeLessThanOrEqual(30);
  });
});
