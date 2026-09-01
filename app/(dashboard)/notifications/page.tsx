import { NotificationList } from "@/components/notification-list";
import { PageHeader } from "@/components/page-header";
import { PushSubscribeButton } from "@/components/push-subscribe-button";
import { requireUser } from "@/lib/auth/require-user";
import { listNotifications } from "@/server/actions/notifications";

export default async function NotificationsPage() {
  await requireUser();
  const notifications = await listNotifications();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <PageHeader
        title="Notifiche"
        description="Allenamento del giorno e proposte di ricalcolo."
      />

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-medium">Push browser</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          Avviso anche a scheda chiusa. Su iPhone: Safari, poi Aggiungi alla
          schermata Home.
        </p>
        <PushSubscribeButton />
      </section>

      <NotificationList notifications={notifications} />
    </main>
  );
}
