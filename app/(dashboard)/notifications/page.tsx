import Link from "next/link";
import { NotificationList } from "@/components/notification-list";
import { PushSubscribeButton } from "@/components/push-subscribe-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { routes } from "@/lib/routes";
import { listNotifications } from "@/server/actions/notifications";

export default async function NotificationsPage() {
  await requireUser();
  const notifications = await listNotifications();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Notifiche
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Centro notifiche
        </h1>
        <p className="mt-2 text-muted-foreground">
          Allenamento del giorno e proposte di ricalcolo. Le push browser sono
          opzionali: le notifiche in-app restano sempre qui.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="font-medium">Push browser</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          Ricevi un avviso anche a scheda chiusa. Su iOS Safari le push
          funzionano solo dopo aver aggiunto il sito alla schermata Home.
        </p>
        <PushSubscribeButton />
      </section>

      <NotificationList notifications={notifications} />

      <Button asChild variant="outline" className="self-start">
        <Link href={routes.dashboard}>Torna alla dashboard</Link>
      </Button>
    </main>
  );
}
