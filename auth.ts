import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { persistStravaSession } from "@/lib/strava/persist-session";
import { stravaAthleteSchema } from "@/lib/strava/schemas";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile }) {
      if (account?.provider === "strava" && account.access_token) {
        if (!account.refresh_token) {
          throw new Error("Strava non ha restituito un refresh token");
        }
        if (!profile) {
          throw new Error("Profilo Strava assente dopo l'OAuth");
        }

        const athlete = stravaAthleteSchema.parse(profile);
        const user = await persistStravaSession({
          athleteId: athlete.id,
          firstname: athlete.firstname,
          lastname: athlete.lastname,
          name: token.name ?? undefined,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAtUnixSeconds: account.expires_at,
          scope: account.scope ?? "",
        });
        token.sub = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
