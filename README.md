# Pacely

Webapp Next.js per programmi di allenamento multi-sport (corsa, nuoto, ciclismo, triathlon) collegata a Strava.

Spec: `PROJECT_SPEC.md`. Roadmap: `TASKS.md`.

## Prerequisiti

- Node.js 20+
- Postgres: [Neon](https://neon.tech) (produzione) oppure Docker in locale
- App [Strava API](https://www.strava.com/settings/api)
- Account [Vercel](https://vercel.com) per il deploy

## Setup locale

```bash
npm install
cp .env.example .env
```

### Database

**Neon:** il workspace è collegato al progetto `soft-sound-52896127` (org Riccardo). Dopo `npx neon auth`:

```bash
npx neon link --project-id soft-sound-52896127 -y
npx neon env pull --file .env
```

Questo scrive `DATABASE_URL` (pooled) e `DATABASE_URL_UNPOOLED` (diretta, per Prisma migrate). Non usare Neon Auth né l'AI Gateway: l'app usa Auth.js + Strava e `/lib/llm`.

**Locale con Docker** (opzionale, senza Neon):

```bash
docker compose up -d
```

Poi in `.env`:

```
DATABASE_URL="postgresql://pacely:pacely@localhost:5432/pacely"
DATABASE_URL_UNPOOLED="postgresql://pacely:pacely@localhost:5432/pacely"
```

Genera i secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Usa un valore per `NEXTAUTH_SECRET` e un altro per `ENCRYPTION_KEY` (32 byte in hex).

```bash
npx prisma migrate dev
npm run dev
```

App: [http://localhost:3000](http://localhost:3000). Health check: `/api/health`.

## Registrazione app Strava

1. Apri [Strava API settings](https://www.strava.com/settings/api) e crea un'applicazione.
2. **Website:** `http://localhost:3000` (in produzione l'URL Vercel).
3. **Authorization Callback Domain:** `localhost` (in produzione il dominio senza `https://`, es. `pacely.vercel.app`).
4. Copia Client ID e Client Secret in `.env` (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`).
5. Auth.js usa il callback `http://localhost:3000/api/auth/callback/strava`.
6. Scope richiesti dall'app: `read`, `activity:read_all`, `profile:read_all`.

Non committare Client Secret, `ENCRYPTION_KEY` o `NEXTAUTH_SECRET`.

## Comandi

```bash
npm run dev          # sviluppo
npm run build        # produzione
npm run lint
npm run format
npm run test         # unit + integration (Vitest)
npx prisma generate
npx prisma migrate dev
npx prisma studio
```

## Deploy Vercel

Il progetto è collegato a Vercel. Imposta le env vars da `.env.example`; per il DB usa gli stessi `DATABASE_URL` e `DATABASE_URL_UNPOOLED` di `npx neon env pull`. Prisma genera il client in `postinstall`. Dopo il deploy, aggiorna Authorization Callback Domain su Strava.
