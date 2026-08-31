import type { NextAuthConfig } from "next-auth";
import { stravaProvider } from "@/lib/strava/provider";
import { isProtectedAppPath, routes } from "@/lib/routes";

export const authConfig = {
  providers: [stravaProvider()],
  pages: {
    signIn: routes.login,
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      if (isProtectedAppPath(request.nextUrl.pathname)) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
