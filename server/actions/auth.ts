"use server";

import { signIn, signOut } from "@/auth";
import { routes } from "@/lib/routes";

export async function connectWithStrava(callbackUrl?: string) {
  await signIn("strava", {
    redirectTo: callbackUrl || routes.dashboard,
  });
}

export async function logout() {
  await signOut({ redirectTo: routes.login });
}
