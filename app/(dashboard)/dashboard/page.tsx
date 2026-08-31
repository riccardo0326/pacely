import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImportStatusCard } from "@/components/import-status";
import { MetricsPanel } from "@/components/metrics-panel";
import { requireUser } from "@/lib/auth/require-user";
import { logout } from "@/server/actions/auth";
import { getImportStatus } from "@/server/actions/import";
import { getDashboardMetrics } from "@/server/actions/metrics";

export default async function DashboardPage() {
  const sessionUser = await requireUser();
  const [importStatus, metrics] = await Promise.all([
    getImportStatus(),
    getDashboardMetrics(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Ciao{sessionUser.name ? `, ${sessionUser.name}` : ""}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Account collegato a Strava. Lo storico viene importato in background
            rispettando i limiti API.
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline">
            Esci
          </Button>
        </form>
      </div>
      <ImportStatusCard initial={importStatus} />
      <MetricsPanel data={metrics} />
      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="font-medium">Programmi di allenamento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea e gestisci piani multi-sport generati con LLM.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/programs">Vai ai programmi</Link>
        </Button>
      </section>
    </main>
  );
}
