"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { routes } from "@/lib/routes";
import { betaFeedbackFormSchema } from "@/lib/validation/beta-feedback";

export type SubmitBetaFeedbackResult =
  { ok: true } | { ok: false; error: string };

export async function submitBetaFeedback(
  formData: FormData,
): Promise<SubmitBetaFeedbackResult> {
  const user = await requireUser();
  const parsed = betaFeedbackFormSchema.safeParse({
    category: formData.get("category"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Controlla il form",
    };
  }

  await prisma.betaFeedback.create({
    data: {
      userId: user.id,
      category: parsed.data.category,
      message: parsed.data.message,
    },
  });

  revalidatePath(routes.feedback);
  return { ok: true };
}
