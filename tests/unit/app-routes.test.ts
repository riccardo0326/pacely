import { describe, expect, it } from "vitest";
import {
  isProtectedAppPath,
  PROXY_MATCHER,
  rewriteLegacyProgramsPath,
  routes,
} from "@/lib/routes";

describe("app routes", () => {
  it("keeps programs outside the /dashboard URL segment", () => {
    expect(routes.programs).toBe("/programs");
    expect(routes.programNew).toBe("/programs/new");
    expect(routes.program("abc")).toBe("/programs/abc");
    expect(routes.program("abc")).not.toContain("/dashboard/");
  });

  it("protects dashboard and programs, not login or public home", () => {
    expect(isProtectedAppPath("/dashboard")).toBe(true);
    expect(isProtectedAppPath("/dashboard/foo")).toBe(true);
    expect(isProtectedAppPath("/programs")).toBe(true);
    expect(isProtectedAppPath("/programs/new")).toBe(true);
    expect(isProtectedAppPath("/programs/abc")).toBe(true);
    expect(isProtectedAppPath("/login")).toBe(false);
    expect(isProtectedAppPath("/")).toBe(false);
  });

  it("rewrites leftover /dashboard/programs URLs", () => {
    expect(rewriteLegacyProgramsPath("/dashboard/programs")).toBe("/programs");
    expect(rewriteLegacyProgramsPath("/dashboard/programs/new")).toBe(
      "/programs/new",
    );
    expect(rewriteLegacyProgramsPath("/dashboard/programs/abc")).toBe(
      "/programs/abc",
    );
    expect(rewriteLegacyProgramsPath("/dashboard")).toBeNull();
    expect(rewriteLegacyProgramsPath("/programs/abc")).toBeNull();
  });

  it("matches the Next.js proxy matcher prefixes", () => {
    expect(PROXY_MATCHER).toEqual([
      "/dashboard/:path*",
      "/programs/:path*",
      "/login",
    ]);
  });
});
