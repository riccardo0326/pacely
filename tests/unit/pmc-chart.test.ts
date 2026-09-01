import { describe, expect, it } from "vitest";
import {
  clientXToIndex,
  pmcXTickIndexes,
  pmcYDomain,
  pmcYTicks,
} from "@/lib/ui/pmc-chart";
import { PROGRAM_STATUS_LABEL, sportLabel } from "@/lib/ui/theme";

describe("pmc chart helpers", () => {
  it("includes zero in the y domain when all values are positive", () => {
    expect(
      pmcYDomain([
        { date: "2026-01-01", ctl: 40, atl: 30, tsb: 10 },
        { date: "2026-01-02", ctl: 42, atl: 35, tsb: 7 },
      ]),
    ).toEqual({ minY: 0, maxY: 42 });
  });

  it("places first, middle and last x ticks", () => {
    expect(pmcXTickIndexes(90)).toEqual([0, 44, 89]);
    expect(pmcYTicks(-8, 40)).toEqual([-8, 0, 40]);
  });

  it("maps pointer x to the nearest point index", () => {
    expect(
      clientXToIndex(100, { left: 0, width: 640 }, 11, 640, {
        top: 12,
        right: 12,
        bottom: 28,
        left: 36,
      }),
    ).toBe(1);
  });
});

describe("theme labels", () => {
  it("maps sports and program statuses for the UI", () => {
    expect(sportLabel("run")).toBe("Corsa");
    expect(PROGRAM_STATUS_LABEL.active).toBe("Attivo");
  });
});
