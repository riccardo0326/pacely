import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SportBadge } from "@/components/sport-badge";
import { requireUser } from "@/lib/auth/require-user";
import { routes } from "@/lib/routes";
import {
  formatActivityDistance,
  formatActivityDuration,
} from "@/lib/strava/format";
import {
  ACTIVITY_SPORTS,
  SPORT_LABELS,
  type ActivitySportFilter,
} from "@/lib/strava/constants";
import { stravaActivityUrl } from "@/lib/ui/theme";
import { cn } from "@/lib/utils";
import { listActivities } from "@/server/actions/activities";

const FILTERS: Array<{ value: ActivitySportFilter; label: string }> = [
  { value: "all", label: "Tutte" },
  ...ACTIVITY_SPORTS.map((sport) => ({
    value: sport,
    label: SPORT_LABELS[sport],
  })),
];

function activitiesHref(sport: ActivitySportFilter, page = 1): string {
  const params = new URLSearchParams();
  if (sport !== "all") {
    params.set("sport", sport);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `${routes.activities}?${query}` : routes.activities;
}

type ActivitiesPageProps = {
  searchParams: Promise<{ sport?: string; page?: string }>;
};

export default async function ActivitiesPage({
  searchParams,
}: ActivitiesPageProps) {
  await requireUser();
  const params = await searchParams;
  const data = await listActivities(params.sport, params.page);
  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <PageHeader
        title="Attività"
        description="Storico Strava importato: corsa, nuoto, ciclismo e carico extra (hike, camminate, palestra)."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = data.sport === filter.value;
          return (
            <Link
              key={filter.value}
              href={activitiesHref(filter.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          title="Nessuna attività"
          description={
            data.sport === "all"
              ? "Quando sincronizzi Strava, le attività compariranno qui."
              : "Nessuna attività per questo filtro."
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {data.items.map((activity) => (
            <li key={activity.id}>
              <a
                href={stravaActivityUrl(activity.stravaActivityId)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {activity.name ?? "Attività"}
                    </span>
                    <SportBadge sport={activity.sport} />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {new Date(activity.startedAt).toLocaleString("it-IT", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {" · "}
                    {formatActivityDuration(activity.durationSec)}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
                  {formatActivityDistance(activity.distanceM, activity.sport)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {data.total > data.pageSize ? (
        <nav className="flex items-center justify-between text-sm">
          {data.page > 1 ? (
            <Link
              href={activitiesHref(data.sport, data.page - 1)}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Precedenti
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            {data.page} / {lastPage}
          </span>
          {data.page < lastPage ? (
            <Link
              href={activitiesHref(data.sport, data.page + 1)}
              className="text-muted-foreground hover:text-foreground"
            >
              Successive →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
