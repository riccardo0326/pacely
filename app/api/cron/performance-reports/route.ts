import { authorizeCronRequest } from "@/lib/cron";
import { runPerformanceReportCron } from "@/server/jobs/performance-reports";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await runPerformanceReportCron();
  return Response.json({ ok: true, ...result });
}
