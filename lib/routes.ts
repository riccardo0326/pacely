export const routes = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  programs: "/programs",
  programNew: "/programs/new",
  program: (id: string) => `/programs/${id}`,
  calendar: "/calendar",
  reports: "/reports",
  report: (id: string) => `/reports/${id}`,
  notifications: "/notifications",
} as const;

export const PROXY_MATCHER = [
  "/dashboard/:path*",
  "/programs/:path*",
  "/calendar/:path*",
  "/reports/:path*",
  "/notifications/:path*",
  "/login",
] as const;

const LEGACY_PROGRAMS_PREFIX = "/dashboard/programs";

/** Old links used /dashboard/programs; real pages live at /programs. */
export function rewriteLegacyProgramsPath(pathname: string): string | null {
  if (pathname === LEGACY_PROGRAMS_PREFIX) {
    return routes.programs;
  }
  if (pathname.startsWith(`${LEGACY_PROGRAMS_PREFIX}/`)) {
    return `${routes.programs}${pathname.slice(LEGACY_PROGRAMS_PREFIX.length)}`;
  }
  return null;
}

export function isProtectedAppPath(pathname: string): boolean {
  return (
    pathname === routes.dashboard ||
    pathname.startsWith(`${routes.dashboard}/`) ||
    pathname === routes.programs ||
    pathname.startsWith(`${routes.programs}/`) ||
    pathname === routes.calendar ||
    pathname.startsWith(`${routes.calendar}/`) ||
    pathname === routes.reports ||
    pathname.startsWith(`${routes.reports}/`) ||
    pathname === routes.notifications ||
    pathname.startsWith(`${routes.notifications}/`)
  );
}
