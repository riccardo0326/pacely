import { authorizeCronRequest } from "@/lib/cron";
import { runDailyWorkoutNotifications } from "@/server/jobs/daily-notifications";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await runDailyWorkoutNotifications();
  return Response.json({ ok: true, ...result });
}
