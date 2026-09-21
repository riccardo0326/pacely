"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { SportBadge } from "@/components/sport-badge";
import { Button } from "@/components/ui/button";
import { USER_FACING_ERROR } from "@/lib/errors/user-facing";
import { JOB_STATUS } from "@/lib/strava/constants";
import { formatActivityDistance } from "@/lib/strava/format";
import { routes } from "@/lib/routes";
import { stravaActivityUrl } from "@/lib/ui/theme";
import { cn } from "@/lib/utils";
import {
  getImportStatus,
  processImportChunk,
  retryImport,
  syncRecentActivities,
  type ImportStatus,
} from "@/server/actions/import";

const RECENT_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", RECENT_DATE);
}

export function ImportStatusCard({ initial }: { initial: ImportStatus }) {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({
    queryKey: ["import-status"],
    queryFn: () => getImportStatus(),
    initialData: initial,
    refetchInterval: (query) => {
      const job = query.state.data?.job;
      if (
        job?.status === JOB_STATUS.pending ||
        job?.status === JOB_STATUS.running
      ) {
        const until = job.progress.rateLimitedUntil
          ? Date.parse(job.progress.rateLimitedUntil)
          : 0;
        return until > Date.now() ? 15_000 : 3_000;
      }
      return false;
    },
  });

  const processMutation = useMutation({
    mutationFn: () => processImportChunk(),
    onSuccess: (data) => {
      queryClient.setQueryData(["import-status"], data);
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => retryImport(),
    onSuccess: (data) => {
      queryClient.setQueryData(["import-status"], data);
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => syncRecentActivities(),
    onSuccess: (data) => {
      queryClient.setQueryData(["import-status"], data);
    },
  });

  const data = statusQuery.data ?? initial;
  const job = data.job;
  const isImporting =
    job?.status === JOB_STATUS.pending || job?.status === JOB_STATUS.running;
  const rateLimitedUntil = job?.progress.rateLimitedUntil;
  const isPaused = Boolean(isImporting && rateLimitedUntil);

  const processMutate = processMutation.mutate;
  const processPending = processMutation.isPending;

  useEffect(() => {
    if (!isImporting || processPending) {
      return;
    }
    if (rateLimitedUntil && Date.parse(rateLimitedUntil) > Date.now()) {
      return;
    }
    processMutate();
  }, [
    isImporting,
    rateLimitedUntil,
    job?.progress.page,
    processPending,
    processMutate,
  ]);

  return (
    <section className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              Attività Strava
            </h2>
            {isImporting ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Loader2 className="size-3 animate-spin" />
                Import in corso
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isImporting
              ? "Stiamo importando il tuo storico..."
              : data.lastSyncAt
                ? `Ultimo sync: ${formatWhen(data.lastSyncAt)}`
                : "Nessuna sincronizzazione ancora completata."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || isImporting}
            className="font-medium shadow-xs transition-transform active:scale-95"
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                syncMutation.isPending && "animate-spin",
              )}
            />
            {syncMutation.isPending ? "Sincronizzo..." : "Sincronizza ora"}
          </Button>
        </div>
      </div>

      {isImporting ? (
        <div className="mt-4 space-y-3">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            aria-hidden
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
          <p className="text-sm">
            Importate <strong>{job.progress.imported}</strong> attività
            {job.progress.skipped > 0
              ? ` (${job.progress.skipped} ignorate, altri sport)`
              : ""}
            .
          </p>
          {isPaused ? (
            <p className="text-sm text-muted-foreground">
              In pausa, riproviamo tra poco.
            </p>
          ) : null}
        </div>
      ) : null}

      {job?.status === JOB_STATUS.failed ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-destructive">
            Import non riuscito. Riprova tra poco.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending}
          >
            Riprova import
          </Button>
        </div>
      ) : null}

      {data.actionError ||
      processMutation.isError ||
      retryMutation.isError ||
      syncMutation.isError ? (
        <p className="mt-4 text-sm text-destructive">
          {data.actionError ??
            (processMutation.isError
              ? USER_FACING_ERROR.importProcess
              : retryMutation.isError
                ? USER_FACING_ERROR.importRetry
                : USER_FACING_ERROR.importSync)}
        </p>
      ) : null}

      {job?.status === JOB_STATUS.done && data.activityCount === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Import completato, ma non ci sono attività di corsa, nuoto, ciclismo o
          extra. Puoi comunque creare un programma.
        </p>
      ) : null}

      {job?.status === JOB_STATUS.done || data.lastSyncAt ? (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <p>
            <strong className="font-semibold text-foreground">
              {data.activityCount}
            </strong>{" "}
            attività importate (corsa, nuoto, ciclismo, extra)
          </p>
          {data.activityCount > 0 ? (
            <Link
              href={routes.activities}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Vedi tutte
              <ArrowRight className="size-3" />
            </Link>
          ) : null}
        </div>
      ) : null}

      {data.recent.length > 0 ? (
        <ul className="mt-3 divide-y divide-border text-sm">
          {data.recent.map((activity) => (
            <li key={activity.id}>
              <a
                href={stravaActivityUrl(activity.stravaActivityId)}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 py-2.5 hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {activity.name ?? "Attività"}
                    </span>
                    <SportBadge sport={activity.sport} />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatDay(activity.startedAt)}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatActivityDistance(activity.distanceM, activity.sport)}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
