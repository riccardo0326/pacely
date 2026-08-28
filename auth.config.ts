import type { NextAuthConfig } from "next-auth";
import { stravaProvider } from "@/lib/strava/provider";

export const authConfig = {
  providers: [stravaProvider()],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      if (request.nextUrl.pathname.startsWith("/dashboard")) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
