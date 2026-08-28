import { ZodError } from "zod";
import {
  handleStravaWebhookEvent,
  verifyStravaSubscription,
} from "@/lib/strava/webhook";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = verifyStravaSubscription({
    mode: url.searchParams.get("hub.mode"),
    challenge: url.searchParams.get("hub.challenge"),
    verifyToken: url.searchParams.get("hub.verify_token"),
    expectedToken: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN,
  });

  if (!result.ok) {
    return new Response("Forbidden", { status: result.status });
  }

  return Response.json({ "hub.challenge": result.challenge });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    await handleStravaWebhookEvent(body);
    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response("Invalid event", { status: 400 });
    }
    throw error;
  }
}
