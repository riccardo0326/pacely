# Pacely — Technical Overview

Multi-sport training platform built on Next.js. Strava is the sole identity provider and activity source. LLM-backed program generation, adaptive feedback, and performance reports are planned; the current codebase implements auth, activity sync, and the LLM abstraction layer.

**Status (August 2026):** Phases 0–6 complete (metrics, LLM, programs, calendar matching). Phase 7+ (feedback, reports, notifications) are pending. See [`TASKS.md`](./TASKS.md) for the full roadmap.

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
│  /server/actions   /server/jobs      /lib/security (AES token encryption) │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Prisma 6 (pooled + direct URL)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PostgreSQL on Neon (serverless, scale-to-zero)             │
│  User · StravaConnection · Activity · Job · LLMInteractionLog · …       │
└─────────────────────────────────────────────────────────────────────────┘

External: Strava API (OAuth, activities, webhooks) · OpenAI / DeepSeek · Vercel Cron
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
    health/                  # Liveness probe
/components                  # Domain + UI components
/lib
  auth/                      # Session helpers (requireUser)
  strava/                    # OAuth provider, API client, normalization, webhook
  llm/                       # Provider abstraction, Zod schemas, cost logging
  metrics/                   # TSS/CTL/ATL/TSB, FTP, VDOT, swim CSS, zones
  matching/                  # Workout ↔ Activity heuristic
  calendar/                  # Week/month ranges, planned vs actual totals
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

**Planned entities** (see `PROJECT_SPEC.md` §7): `WorkoutFeedback`, `RecalcProposal`, `PerformanceReport`, `Notification`.

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

---

## API routes

| Method     | Path                      | Auth                  | Description                        |
| ---------- | ------------------------- | --------------------- | ---------------------------------- |
| `GET/POST` | `/api/auth/[...nextauth]` | Public                | Auth.js OAuth flow                 |
| `GET`      | `/api/health`             | Public                | Health check                       |
| `GET/POST` | `/api/strava/webhook`     | Verify token          | Strava webhook validation + events |
| `GET`      | `/api/cron/strava-sync`   | `Bearer $CRON_SECRET` | Daily fallback activity sync       |

Future program/feedback endpoints will follow the same pattern: Route Handlers for webhooks/cron, Server Actions for UI mutations.

---

## Background jobs

Pacely uses a **database-backed job queue** (`Job` table) instead of Redis or dedicated workers:

| Job type          | Trigger                                      | Behavior                                                            |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `strava_backfill` | First OAuth connection                       | Paginated historical import; progress stored in `Job.progress` JSON |
| `metrics_recalc`  | After webhook/sync/backfill activity changes | Recompute TSS/CTL/ATL/TSB snapshots                                 |
| workout matching  | After the same activity changes + calendar   | Pair planned workouts to Strava activities; not a `Job` row         |

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

Cron schedule (from `vercel.json`): `/api/cron/strava-sync` at `0 5 * * *` (05:00 UTC daily).

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
