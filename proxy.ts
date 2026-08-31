import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import {
  isProtectedAppPath,
  rewriteLegacyProgramsPath,
  routes,
} from "@/lib/routes";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);
  const isLogin = pathname === routes.login;

  const rewritten = rewriteLegacyProgramsPath(pathname);
  if (rewritten) {
    const target = new URL(rewritten, req.nextUrl.origin);
    target.search = req.nextUrl.search;
    return Response.redirect(target);
  }

  if (isProtectedAppPath(pathname) && !isLoggedIn) {
    const loginUrl = new URL(routes.login, req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  if (isLogin && isLoggedIn) {
    return Response.redirect(new URL(routes.dashboard, req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/programs/:path*", "/login"],
};
