import { describe, expect, it } from "vitest";
import {
  atlAlertLevel,
  ctlAlertLevel,
  tsbAlertLevel,
} from "@/lib/metrics/kpi-status";

describe("kpi alert levels", () => {
  it("flags a deeply negative TSB as alert and a mild dip as watch", () => {
    expect(tsbAlertLevel(-35)).toBe("alert");
    expect(tsbAlertLevel(-18)).toBe("watch");
    expect(tsbAlertLevel(5)).toBe("ok");
    expect(tsbAlertLevel(30)).toBe("watch");
  });

  it("flags ATL well above CTL as alert", () => {
    expect(atlAlertLevel(80, 50)).toBe("alert");
    expect(atlAlertLevel(55, 50)).toBe("watch");
    expect(atlAlertLevel(45, 50)).toBe("ok");
  });

  it("flags a CTL jump or crash over a week", () => {
    expect(ctlAlertLevel(60, 50)).toBe("alert");
    expect(ctlAlertLevel(55, 50)).toBe("watch");
    expect(ctlAlertLevel(42, 50)).toBe("alert");
    expect(ctlAlertLevel(51, 50)).toBe("ok");
    expect(ctlAlertLevel(50, null)).toBe("ok");
  });
});
