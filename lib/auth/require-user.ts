import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { routes } from "@/lib/routes";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(routes.login);
  }
  return session.user;
}
