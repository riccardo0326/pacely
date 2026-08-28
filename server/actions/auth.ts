"use server";

import { signIn, signOut } from "@/auth";

export async function connectWithStrava(callbackUrl?: string) {
  await signIn("strava", {
    redirectTo: callbackUrl || "/dashboard",
  });
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
