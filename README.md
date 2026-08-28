# Pacely

**Multi-sport training web application** — Next.js full-stack app that connects to Strava, imports activity history, computes training load metrics, and (roadmap) generates LLM-assisted training programs with adaptive feedback for running, cycling, swimming, and triathlon.

| | |
|---|---|
| **Stack** | Next.js 16 · React 19 · TypeScript · Prisma · PostgreSQL (Neon) · Auth.js · TanStack Query · Tailwind 4 · shadcn/ui |
| **Integrations** | Strava OAuth + Webhooks · OpenAI / DeepSeek (via `/lib/llm`) |
| **Deploy** | Vercel (Cron Jobs for fallback sync) |
| **Docs** | [TECHNICAL.md](./TECHNICAL.md) · [PROJECT_SPEC.md](./PROJECT_SPEC.md) · [TASKS.md](./TASKS.md) |

## Current implementation status

| Phase | Scope | Status |
|---|---|---|
| 0 | Project setup, CI, Vercel deploy | Done |
| 1 | Strava OAuth, encrypted tokens, route protection | Done |
| 2 | Activity import (backfill + webhook + cron fallback) | Done |
| 3 | Metrics engine (TSS, CTL/ATL/TSB, FTP, VDOT, swim threshold) | In progress |
| 4 | LLM abstraction (DeepSeek + OpenAI, Zod validation, cost logging) | Done |
| 5+ | Programs, calendar, feedback loop, performance reports | Planned |

MVP scope and exclusions are defined in [`PROJECT_SPEC.md`](./PROJECT_SPEC.md). Task-level progress is tracked in [`TASKS.md`](./TASKS.md).

## Architecture (summary)

```
Browser → Next.js App Router → Server Actions / API Routes
              ↓
    Auth.js (JWT) · /lib/strava · /lib/llm · /lib/metrics
              ↓
         Prisma → PostgreSQL (Neon)
              ↓
    Strava API · OpenAI / DeepSeek
```

Every database query is scoped to the authenticated user's `userId`. Strava tokens are AES-256-GCM encrypted at rest. LLM responses are JSON-only, Zod-validated, with retry and explicit algorithmic fallback.

See **[TECHNICAL.md](./TECHNICAL.md)** for data model, API routes, sync flow, security model, and development conventions.

## Prerequisites

- **Node.js** ≥ 20
- **PostgreSQL** — [Neon](https://neon.tech) (recommended) or local Docker
- **Strava API application** — [Create one](https://www.strava.com/settings/api)
- **LLM API key** — DeepSeek and/or OpenAI (DeepSeek is the default provider)
- **Vercel account** — for production deployment and cron jobs

## Local setup

```bash
git clone https://github.com/riccardo0326/pacely.git
cd pacely
npm install
cp .env.example .env
```

### Environment variables

Copy [`.env.example`](./.env.example) and fill in the required values. Key groups:

| Group | Variables |
|---|---|
| Database | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` |
| Auth | `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET` |
| Strava | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_WEBHOOK_VERIFY_TOKEN` |
| Security | `ENCRYPTION_KEY` (32-byte hex), `CRON_SECRET` |
| LLM | `LLM_PROVIDER`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use one value for `NEXTAUTH_SECRET` / `AUTH_SECRET` and a separate value for `ENCRYPTION_KEY`.

### Database

**Neon (recommended):**

```bash
npx neon link --project-id <your-project-id> -y
npx neon env pull --file .env
```

This writes pooled `DATABASE_URL` and direct `DATABASE_URL_UNPOOLED` (Prisma `directUrl` for migrations).

**Local Docker:**

```bash
docker compose up -d
```

```env
DATABASE_URL="postgresql://pacely:pacely@localhost:5432/pacely"
DATABASE_URL_UNPOOLED="postgresql://pacely:pacely@localhost:5432/pacely"
```

### Run migrations and start dev server

```bash
npx prisma migrate dev
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Health check: `/api/health`
- Login: `/login` → Strava OAuth

## Strava application configuration

1. Create an application at [Strava API settings](https://www.strava.com/settings/api).
2. **Website:** `http://localhost:3000` (production: your Vercel URL).
3. **Authorization Callback Domain:** `localhost` (production: hostname only, e.g. `pacely.vercel.app`).
4. Set `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` in `.env`.
5. OAuth callback: `http://localhost:3000/api/auth/callback/strava`.
6. Required scopes: `read`, `activity:read_all`, `profile:read_all`.
7. Generate random tokens for `STRAVA_WEBHOOK_VERIFY_TOKEN` and `CRON_SECRET`.

### Webhook (incremental sync)

After deploying to a public HTTPS endpoint, register the push subscription:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=$STRAVA_CLIENT_ID \
  -F client_secret=$STRAVA_CLIENT_SECRET \
  -F callback_url=https://YOUR_DOMAIN/api/strava/webhook \
  -F verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN
```

For local development, use an HTTPS tunnel (ngrok, etc.) to `/api/strava/webhook`. Without a webhook, use the dashboard **Sync now** button or the daily cron fallback.

### Cron fallback

`GET /api/cron/strava-sync` with header `Authorization: Bearer $CRON_SECRET`.

Vercel runs this daily at 05:00 UTC (`vercel.json`). Local test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/strava-sync
```

## LLM usage

All LLM calls are centralized in `/lib/llm`. Do not invoke OpenAI or DeepSeek directly from application code.

- **Default provider:** DeepSeek (`LLM_PROVIDER=deepseek`)
- **Override per call:** `getLLMProvider({ provider: "openai" })`
- **Output:** JSON validated with Zod schemas; max 2 parse attempts, then explicit algorithmic fallback
- **Observability:** Token usage and estimated USD cost logged to `LLMInteractionLog`

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run format       # Prettier
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (unit + integration)
npx prisma generate  # Regenerate Prisma client
npx prisma migrate dev   # Create/apply migrations
npx prisma studio    # Database GUI
```

## Deployment (Vercel)

1. Import the repository into Vercel.
2. Set environment variables from `.env.example`.
3. Use Neon `DATABASE_URL` and `DATABASE_URL_UNPOOLED` from `npx neon env pull`.
4. Prisma client is generated on `postinstall`.
5. After deploy, update Strava Authorization Callback Domain and register the webhook.

## Testing

```bash
npm run test
```

- **Unit tests** — Strava payload normalization, LLM schema validation, encryption helpers
- **Integration tests** — OAuth flow (mocked Strava), webhook → activity persistence

Pre-commit hooks (Husky) run ESLint and Prettier on staged files.

## License

Private repository — all rights reserved.
