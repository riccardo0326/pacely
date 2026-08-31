import { describe, expect, it } from "vitest";
import {
  calibrationWeekCount,
  isWithinCalibrationWindow,
} from "@/lib/feedback/calibration";
import { DEFAULT_CALIBRATION_CONFIG } from "@/lib/feedback/constants";

describe("calibration window", () => {
  it("uses 2 weeks for programs up to 8 weeks", () => {
    expect(calibrationWeekCount(4)).toBe(2);
    expect(calibrationWeekCount(8)).toBe(2);
    expect(calibrationWeekCount(9)).toBe(2);
  });

  it("uses 3 weeks for programs of 10-12 weeks", () => {
    expect(calibrationWeekCount(10)).toBe(3);
    expect(calibrationWeekCount(12)).toBe(3);
  });

  it("honors an injected config instead of hardcoded cases", () => {
    const config = {
      ...DEFAULT_CALIBRATION_CONFIG,
      shortMaxWeeks: 6,
      shortWindowWeeks: 1,
      longMinWeeks: 8,
      longWindowWeeks: 4,
    };
    expect(calibrationWeekCount(6, config)).toBe(1);
    expect(calibrationWeekCount(8, config)).toBe(4);
  });

  it("includes the last day of the window and excludes the next", () => {
    const start = new Date("2026-04-06T00:00:00.000Z");
    expect(
      isWithinCalibrationWindow(start, 8, new Date("2026-04-06T00:00:00.000Z")),
    ).toBe(true);
    expect(
      isWithinCalibrationWindow(start, 8, new Date("2026-04-19T00:00:00.000Z")),
    ).toBe(true);
    expect(
      isWithinCalibrationWindow(start, 8, new Date("2026-04-20T00:00:00.000Z")),
    ).toBe(false);
  });

  it("uses 21 days for a 12-week program", () => {
    const start = new Date("2026-04-06T00:00:00.000Z");
    expect(
      isWithinCalibrationWindow(
        start,
        12,
        new Date("2026-04-26T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isWithinCalibrationWindow(
        start,
        12,
        new Date("2026-04-27T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
