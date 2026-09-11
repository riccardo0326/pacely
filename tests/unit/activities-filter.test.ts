import { describe, expect, it } from "vitest";
import { parseActivitySportFilter } from "@/lib/strava/constants";

describe("parseActivitySportFilter", () => {
  it("accepts known sports and defaults to all", () => {
    expect(parseActivitySportFilter("run")).toBe("run");
    expect(parseActivitySportFilter("other")).toBe("other");
    expect(parseActivitySportFilter("yoga")).toBe("all");
    expect(parseActivitySportFilter(undefined)).toBe("all");
  });
});
