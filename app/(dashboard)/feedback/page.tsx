import { BetaFeedbackForm } from "@/components/beta-feedback-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/require-user";

export default async function FeedbackPage() {
  await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <PageHeader
        title="Feedback"
        description="Segnala un problema o un'idea. I messaggi restano legati al tuo account."
      />

      <BetaFeedbackForm />
    </main>
  );
}
