import Strava from "next-auth/providers/strava";

export const STRAVA_SCOPES = "read,activity:read_all,profile:read_all";

export function stravaProvider() {
  return Strava({
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    authorization: {
      params: {
        scope: STRAVA_SCOPES,
        approval_prompt: "auto",
        response_type: "code",
      },
    },
    profile(profile) {
      return {
        id: String(profile.id),
        name: `${profile.firstname} ${profile.lastname}`.trim() || "Atleta",
        email: null,
        image: profile.profile,
      };
    },
  });
}
