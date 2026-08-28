import { authorizeCronRequest } from "@/lib/cron";
import { runStravaSyncCron } from "@/server/jobs/strava-sync";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  await runStravaSyncCron();
  return Response.json({ ok: true });
}
