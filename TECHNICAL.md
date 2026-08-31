# Pacely — Technical Overview

Multi-sport training platform built on Next.js. Strava is the sole identity provider and activity source. LLM-backed program generation, adaptive feedback, performance reports, and notifications are implemented through Phase 9.

**Status (August 2026):** Phases 0–9 complete (metrics, LLM, programs, calendar matching, feedback, suggested recalc, performance reports, in-app + Web Push notifications). Phase 10 (polish / beta) is pending. See [`TASKS.md`](./TASKS.md) for the full roadmap.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Client (React 19 + TanStack Query)              │
│  /app/(auth)          /app/(dashboard)         shadcn/ui + Tailwind 4   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Server Components / Server Actions
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router (Node.js ≥20)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ Auth.js v5   │  │ /lib/strava  │  │ /lib/llm     │  │ /lib/metrics│  │
│  │ JWT sessions │  │ OAuth client │  │ OpenAI/      │  │ TSS/CTL/FTP │  │
│  │ Strava prov. │  │ webhook sync │  │ DeepSeek     │  │ TSS/CTL/…   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
│  /lib/feedback  /lib/reports  /lib/notifications  /server/actions  /server/jobs  /lib/security │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Prisma 6 (pooled + direct URL)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PostgreSQL on Neon (serverless, scale-to-zero)             │
│  User · StravaConnection · Activity · Job · LLMInteractionLog · …       │
└─────────────────────────────────────────────────────────────────────────┘

External: Strava API (OAuth, activities, webhooks) · OpenAI / DeepSeek · Web Push (VAPID) · Vercel Cron
```

### Request flow — activity sync

1. **Initial backfill:** On first Strava connection, a `Job` record (`type: strava_backfill`) is enqueued. Dashboard server actions process chunks with rate-limit-aware pagination against Strava's activity list API.
2. **Incremental sync:** Strava webhooks (`POST /api/strava/webhook`) deliver create/update/delete events. Each event fetches the full activity detail and upserts into `Activity`.
3. **Fallback cron:** `GET /api/cron/strava-sync` (Vercel Cron, daily at 05:00 UTC) polls users whose webhook may have missed events. Protected by `Authorization: Bearer $CRON_SECRET`.
4. **Manual sync:** Dashboard exposes a "Sync now" action for on-demand incremental sync.

All activity queries are scoped by `userId` from the authenticated session — no cross-tenant reads.

---

## Stack

| Layer         | Technology                              | Notes                                                                    |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| Runtime       | Node.js ≥20                             | Enforced in `package.json` engines                                       |
| Framework     | Next.js 16 (App Router)                 | Server Components, Route Handlers, Server Actions                        |
| Language      | TypeScript (strict)                     | `tsc --noEmit` in CI                                                     |
| Auth          | Auth.js v5 (`next-auth@5.0.0-beta.32`)  | Custom Strava OAuth provider; JWT sessions (no Account/Session tables)   |
| Database      | PostgreSQL on [Neon](https://neon.tech) | Pooled `DATABASE_URL` + direct `DATABASE_URL_UNPOOLED` for migrations    |
| ORM           | Prisma 6.19                             | Versioned migrations under `prisma/migrations/`                          |
| UI            | Tailwind CSS 4 + shadcn/ui              | Radix primitives, Lucide icons                                           |
| Client state  | TanStack Query v5                       | Server-state cache and invalidation                                      |
| Validation    | Zod 4                                   | Boundary validation for Strava payloads, LLM output, forms               |
| LLM           | `/lib/llm` abstraction                  | DeepSeek (default) and OpenAI via OpenAI-compatible Chat Completions API |
| Testing       | Vitest + Testing Library                | Unit tests in `tests/unit/`, integration in `tests/integration/`         |
| Observability | Sentry (optional)                       | No-op without `SENTRY_DSN`                                               |
| Deploy        | Vercel                                  | Cron jobs defined in `vercel.json`                                       |

---

## Repository layout

```
/app
  (auth)/login/              # Strava OAuth entry point
  (dashboard)/dashboard/     # Protected athlete dashboard
  (dashboard)/calendar/      # Weekly/monthly planned vs actual
  (dashboard)/programs/      # Program list, create, detail + editor
  api/
    auth/[...nextauth]/      # Auth.js route handler
    strava/webhook/          # Strava push subscription endpoint
    cron/strava-sync/        # Daily fallback sync
    cron/performance-reports/ # Periodic LLM reports
    cron/notifications/      # Today's-workout reminders
    health/                  # Liveness probe
/components                  # Domain + UI components
/lib
  auth/                      # Session helpers (requireUser)
  strava/                    # OAuth provider, API client, normalization, webhook
  llm/                       # Provider abstraction, Zod schemas, cost logging
  metrics/                   # TSS/CTL/ATL/TSB, FTP, VDOT, swim CSS, zones
  matching/                  # Workout ↔ Activity heuristic
  calendar/                  # Week/month ranges, planned vs actual totals
  feedback/                  # Calibration window, suggested recalc diffs
  reports/                   # Performance report window, trends, generation
  notifications/             # In-app + Web Push (VAPID)
  security/                  # AES encryption for Strava tokens at rest
  validation/                # Shared Zod schemas
/server
  actions/                   # Server Actions (mutations from UI)
  jobs/                      # Backfill processor, sync helpers
/prisma/schema.prisma        # Data model + migrations
/tests/unit | integration
/types                       # Shared TypeScript declarations
```

---

## Data model (implemented)

| Model                                   | Purpose                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `User`                                  | Athlete identity keyed by `stravaAthleteId`; `role` defaults to `"athlete"` (extensible to `"coach"`)                 |
| `StravaConnection`                      | Encrypted access/refresh tokens, OAuth scope, `lastSyncAt`                                                            |
| `Activity`                              | Normalized Strava activity (`run` \| `swim` \| `ride`); stores `sourceRaw` JSON for reprocessing                      |
| `Job`                                   | Lightweight async queue (`pending` → `running` → `done` \| `failed`); used for historical backfill and metrics recalc |
| `LLMInteractionLog`                     | Per-call token usage, estimated USD cost, success/fallback flags                                                      |
| `PerformanceMetricSnapshot`             | Daily CTL/ATL/TSB plus current FTP, VDOT, swim CSS, and per-sport TSS breakdown                                       |
| `Program` / `Goal` / `Week` / `Workout` | LLM-generated training plan with block-structured workouts; `activityId` + `matchSource` when linked to Strava        |
| `WorkoutFeedback`                       | Free-text note after a completed workout plus structured LLM analysis (RPE, factors, plan deviation)                  |
| `RecalcProposal`                        | Suggested future-workout diff; `pending` until the athlete approves or rejects — never auto-applied                   |
| `PerformanceReport`                     | Periodic LLM summary (`content` JSON: strengths / improvements / suggestions); `source` `scheduled` \| `on_demand`    |
| `Notification`                          | In-app item (`workout_today` \| `recalc_proposal`); `readAt` null = unread; `dedupeKey` for idempotency               |
| `PushSubscription`                      | Browser Web Push endpoint + VAPID keys (`p256dh`, `auth`) per user                                                    |

**Planned entities** (see `PROJECT_SPEC.md` §7): none remaining for MVP.

### Activity normalization

Strava activity types are mapped to three internal sports:

- **run** — Run, Trail Run, Virtual Run
- **ride** — Ride, Gravel Ride, Mountain Bike Ride, Virtual Ride (e-bike excluded)
- **swim** — Swim, Open Water Swim

Imported fields include duration (`moving_time` preferred), distance, elevation, heart rate, power, cadence, pace, perceived exertion, and optional splits. The raw Strava payload is preserved in `sourceRaw`.

### Workout ↔ Activity matching

After each activity upsert/delete (webhook, incremental sync, backfill) and when opening `/calendar`, unmatched workouts on **active** programs are paired to Strava activities:

- Same UTC calendar day and same sport (`run` / `swim` / `ride`)
- Similar duration (within 40% of planned, or 15 minutes)
- Greedy 1:1 assignment by duration similarity; one activity never binds two workouts
- Match sets `status=completed` and `matchSource=auto`
- A manual link/unlink/skip sets `matchSource=manual` and is not overwritten by rematch
- Unmatched planned workouts older than 2 days are auto-skipped (still rematchable if `matchSource` is not `manual`)

The calendar at `/calendar` has week and month views, planned vs actual duration/TSS, and controls to correct a match.

### Feedback and suggested recalc

After a workout is `completed` (matched to a Strava activity), the athlete can leave a free-text note. `LLMProvider.analyzeFeedback` extracts RPE, external factors, and `planDeviation`. The text and JSON analysis are stored on `WorkoutFeedback` (one per workout).

A **recalc proposal** is generated only when all of these hold:

- `planDeviation` is `significant`
- the workout's planned date falls in the calibration window (2 weeks if the program is ≤8 weeks, 3 weeks if 10–12 weeks; parameterized in `/lib/feedback`)
- no other `pending` proposal exists for that program
- there are future `planned` workouts to patch

The workout diff is built algorithmically from `suggestedAction` (`reduce_load`, `shift_rest_day`, `extend_recovery`) — not a second LLM call. Approve/reject is explicit in the UI (dashboard, calendar, program detail). Approving writes the patches onto future `Workout` rows; rejecting only updates `RecalcProposal.status`.

### Performance reports

`LLMProvider.analyzePerformance` builds an informational summary from:

- metric trends (first vs last `PerformanceMetricSnapshot` in the window: CTL/ATL/TSB, FTP, VDOT, swim threshold)
- workout feedback collected in the same window (`WorkoutFeedback.createdAt`)

Output is Zod-validated JSON (`summary`, `strengths`, `improvements`, `suggestions`) stored on `PerformanceReport.content`. The report never changes the plan.

- **Window:** `REPORT_PERIOD_DAYS` (14–28, default 14), inclusive UTC dates. On-demand UI offers 14 or 28 days.
- **Scheduled:** `GET /api/cron/performance-reports` daily at 06:00 UTC; skips users whose last report is newer than the window or who have no snapshots/feedback; max 5 users per run.
- **On-demand:** server action from `/reports` (5 LLM calls/user/hour).
- **UI:** `/reports` list and `/reports/[id]`.

### Notifications

In-app notifications are always created; browser push is opt-in.

- **Today's workout:** `GET /api/cron/notifications` at 07:00 UTC. Users with `planned` workouts on active programs for the UTC day get one `workout_today` notification (`dedupeKey` = `workout_today:YYYY-MM-DD`). Payload lists sport, name, duration. Links to `/calendar`. Max 50 users per run.
- **Recalc proposal:** `notifyRecalcProposal` runs after a pending `RecalcProposal` is saved from feedback. Links to `/programs/:id`. Push failure is logged and does not roll back the proposal.
- **Web Push:** `web-push` with VAPID (`WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY`). Service worker at `/sw.js`. Expired endpoints (HTTP 404/410) are deleted. Missing VAPID keys skip push and keep in-app only.
- **UI:** header bell (unread count), `/notifications` (list, mark read / mark all, enable/disable push).

---

## Authentication and security

- **Identity:** Strava OAuth 2.0 only. No email/password in MVP.
- **Scopes:** `read`, `activity:read_all`, `profile:read_all`.
- **Sessions:** JWT-based via Auth.js; callback at `/api/auth/callback/strava`.
- **Token storage:** Strava access and refresh tokens encrypted at rest with `ENCRYPTION_KEY` (32-byte hex or base64) using AES-256-GCM in `/lib/security/encryption.ts`.
- **Token refresh:** Access tokens expire after 6 hours; refresh is handled transparently before API calls.
- **Route protection:** Dashboard routes require an authenticated session via middleware and `requireUser()` helpers.
- **Secrets:** All credentials via environment variables; never committed. See [`.env.example`](./.env.example).

---

## Strava integration

### Rate limits

The client in `/lib/strava/client.ts` respects Strava's application limits:

- **200 requests / 15 minutes**
- **2,000 requests / day**

Backoff and retry logic live in `/lib/strava/rate-limit.ts`. Backfill uses activity list summaries (not streams) to minimize API calls.

### Webhook subscription

After deploying to a public HTTPS URL, register a push subscription:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=$STRAVA_CLIENT_ID \
  -F client_secret=$STRAVA_CLIENT_SECRET \
  -F callback_url=https://YOUR_DOMAIN/api/strava/webhook \
  -F verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN
```

Local development requires an HTTPS tunnel (e.g. ngrok) pointing to `/api/strava/webhook`.

---

## LLM layer

All LLM calls go through `/lib/llm` — direct provider SDK usage elsewhere is forbidden.

### Interface

```typescript
interface LLMProvider {
  generateProgram(
    input: ProgramGenerationInput,
  ): Promise<ProgramGenerationOutput>;
  analyzeFeedback(
    input: FeedbackAnalysisInput,
  ): Promise<FeedbackAnalysisOutput>;
  analyzePerformance(
    input: PerformanceAnalysisInput,
  ): Promise<PerformanceReportOutput>;
}
```

### Providers

| Provider | Model           | Selection                                  |
| -------- | --------------- | ------------------------------------------ |
| DeepSeek | `deepseek-chat` | Default (`LLM_PROVIDER=deepseek`)          |
| OpenAI   | `gpt-4o-mini`   | `LLM_PROVIDER=openai` or per-call override |

### Structured output pipeline

1. Prompt → Chat Completions API (OpenAI-compatible `fetch`, no SDK)
2. Response parsed as JSON
3. Validated against Zod schemas in `/lib/llm/schemas.ts`
4. On validation failure: retry once (2 attempts total)
5. On repeated failure: explicit algorithmic fallback (`source: "fallback"`) — never silent crash or client-side invention
6. Every call logged to `LLMInteractionLog` with token counts and estimated cost from static price tables in `/lib/llm/constants.ts`

HTTP 429/5xx responses trigger up to 2 retries with exponential backoff.

Generate/regenerate program: 5 LLM calls per user per hour. Feedback analysis: 20 per user per hour. Performance reports: 5 per user per hour (`LLMInteractionLog` counts).

---

## API routes

| Method     | Path                            | Auth                  | Description                        |
| ---------- | ------------------------------- | --------------------- | ---------------------------------- |
| `GET/POST` | `/api/auth/[...nextauth]`       | Public                | Auth.js OAuth flow                 |
| `GET`      | `/api/health`                   | Public                | Health check                       |
| `GET/POST` | `/api/strava/webhook`           | Verify token          | Strava webhook validation + events |
| `GET`      | `/api/cron/strava-sync`         | `Bearer $CRON_SECRET` | Daily fallback activity sync       |
| `GET`      | `/api/cron/performance-reports` | `Bearer $CRON_SECRET` | Periodic performance report job    |
| `GET`      | `/api/cron/notifications`       | `Bearer $CRON_SECRET` | Today's-workout in-app + push      |

Future program/feedback endpoints will follow the same pattern: Route Handlers for webhooks/cron, Server Actions for UI mutations.

---

## Background jobs

Pacely uses a **database-backed job queue** (`Job` table) instead of Redis or dedicated workers:

| Job type            | Trigger                                      | Behavior                                                            |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `strava_backfill`   | First OAuth connection                       | Paginated historical import; progress stored in `Job.progress` JSON |
| `metrics_recalc`    | After webhook/sync/backfill activity changes | Recompute TSS/CTL/ATL/TSB snapshots                                 |
| workout matching    | After the same activity changes + calendar   | Pair planned workouts to Strava activities; not a `Job` row         |
| performance reports | Daily cron + on-demand server action         | `analyzePerformance`; not a `Job` row                               |
| daily notifications | Daily cron (today's workouts) + feedback     | In-app `Notification` + Web Push; not a `Job` row                   |

Job processing is triggered from dashboard Server Actions (backfill chunks) and cron/webhook handlers (incremental sync). Vercel Hobby cron runs once daily; interactive dashboard actions provide lower-latency processing.

---

## Development workflow

```bash
npm install && cp .env.example .env
npx prisma migrate dev
npm run dev          # http://localhost:3000
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run test         # Vitest (unit + integration)
npm run build        # Production build
```

Pre-commit hooks (Husky + lint-staged) run ESLint and Prettier on staged files.

### Database (Neon)

```bash
npx neon link --project-id <project-id> -y
npx neon env pull --file .env   # writes DATABASE_URL + DATABASE_URL_UNPOOLED
```

Prisma uses the pooled URL for runtime queries and the direct/unpooled URL (`directUrl`) for migrations.

Local alternative: `docker compose up -d` with Postgres on `localhost:5432`.

---

## Deployment (Vercel)

1. Connect the GitHub repository to Vercel.
2. Set all variables from `.env.example` in the Vercel dashboard.
3. `postinstall` runs `prisma generate` automatically.
4. Update Strava **Authorization Callback Domain** to the production hostname.
5. Register the Strava webhook against the production URL.

Cron schedule (from `vercel.json`): `/api/cron/strava-sync` at `0 5 * * *` (05:00 UTC daily); `/api/cron/performance-reports` at `0 6 * * *` (06:00 UTC daily); `/api/cron/notifications` at `0 7 * * *` (07:00 UTC daily).

---

## Design principles

These constraints apply to all new code:

1. **Type safety** — Explicit input/output types for domain functions; no unjustified `any`.
2. **Validation at boundaries** — Strava, LLM, and user input validated with Zod before use or persistence.
3. **Structured LLM output** — No free-text parsing for application data; retry then fallback.
4. **Per-user isolation** — Every query filters by session `userId`.
5. **Encrypted secrets** — Strava tokens encrypted at rest; API keys only in env vars.
6. **Centralized LLM** — All provider calls through `/lib/llm` with cost logging.
7. **Versioned migrations** — Schema changes only via `prisma migrate dev`.

Full product specification: [`PROJECT_SPEC.md`](./PROJECT_SPEC.md). Execution roadmap: [`TASKS.md`](./TASKS.md).
