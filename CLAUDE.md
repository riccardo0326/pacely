# CLAUDE.md — Istruzioni operative per l'agente di coding su Pacely

Questo file guida qualsiasi agente (Claude Code o altro) che lavora su questa repo. Leggilo per intero prima di iniziare qualunque task. Fai riferimento a `PROJECT_SPEC.md` per il contesto di prodotto e a `TASKS.md` per la roadmap.

---

## 1. Cos'è questo progetto

Pacely è una webapp Next.js full-stack per la creazione e l'analisi di programmi di allenamento multi-sport (corsa, nuoto, ciclismo, triathlon) collegata a Strava, con generazione dei piani assistita da LLM e feedback adattivo. MVP single-role (`athlete`), nessun coaching in questa fase. Dettagli completi in `PROJECT_SPEC.md`.

---

## 2. Stack tecnico (vincolante)

- **Next.js 14+ (App Router)**, TypeScript strict mode.
- **Auth.js (NextAuth)** con provider custom Strava OAuth.
- **PostgreSQL** (Neon) + **Prisma** come ORM.
- **Tailwind CSS + shadcn/ui** per la UI.
- **TanStack Query** per data fetching lato client.
- **Zod** per ogni validazione di input/output (incluso output LLM).
- **Vercel Cron Jobs** per sync periodici e job asincroni.
- **Provider LLM**: astrazione comune con implementazioni OpenAI e DeepSeek, switchabili via env.
- Deploy target: **Vercel**.

Non introdurre librerie/framework alternativi a quanto sopra senza motivarlo esplicitamente e senza che sia discusso — se un task sembra richiedere una dipendenza nuova importante (es. una queue library, un nuovo state manager), fermati e segnala la scelta invece di aggiungerla silenziosamente.

---

## 3. Struttura repo attesa

```
/app                      # Next.js App Router
  /(auth)                 # pagine login/callback strava
  /(dashboard)            # area autenticata: calendario, programmi, attività, report
  /api                    # route handlers (webhook strava, endpoint interni)
/components
  /ui                     # componenti shadcn generati
  /...                    # componenti di dominio (WorkoutCard, ProgramTimeline, ecc.)
/lib
  /llm                    # astrazione provider LLM (interface + implementazioni)
  /strava                 # client Strava API, gestione token, webhook handler
  /metrics                # calcolo TSS/CTL/ATL/TSB/FTP/VDOT/soglia nuoto
  /validation             # schemi Zod condivisi
/prisma
  schema.prisma
  /migrations
/server
  /actions                # server actions per mutazioni
  /jobs                   # logica dei cron job (sync, ricalcolo metriche)
/tests
  /unit
  /integration
CLAUDE.md
PROJECT_SPEC.md
TASKS.md
```

Se una struttura diversa risulta necessaria durante lo sviluppo, aggiornala qui prima di procedere in modo incoerente.

---

## 4. Principi di sviluppo

1. **Type safety ovunque.** No `any` non giustificato. Ogni funzione di dominio (metriche, generazione LLM, sync Strava) ha tipi espliciti in ingresso/uscita.
2. **Validazione ai confini.** Ogni dato che entra da fonte esterna (Strava API, output LLM, input utente via form) passa da uno schema Zod prima di essere usato o salvato.
3. **Output LLM sempre strutturato.** Nessuna feature deve fare parsing "creativo" di testo libero del modello per dati che devono guidare logica applicativa (es. contenuto di un workout). Se il parsing/validazione fallisce, gestisci un retry (max 1-2) e poi un fallback esplicito (mai un crash silenzioso o dati inventati lato client).
4. **Isolamento dati per utente.** Ogni query deve filtrare esplicitamente per `userId` della sessione corrente — nessuna eccezione, anche in fase di prototipo.
5. **Segreti mai in chiaro.** Token Strava cifrati at-rest. Nessuna API key hardcoded: tutto da variabili ambiente (vedi §6).
6. **Costi LLM monitorati.** Ogni chiamata a un provider LLM deve passare dal layer di astrazione in `/lib/llm` e loggare uso token/costo stimato in `LLMInteractionLog`. Non chiamare provider LLM direttamente da altri punti del codice.
7. **Task piccoli e verificabili.** Segui `TASKS.md` nell'ordine indicato. Ogni task ha una "definition of done" (vedi §7) — non passare al successivo finché non è soddisfatta.
8. **Niente feature non richieste.** Se durante un task noti una feature utile ma fuori scope MVP, annotala in `TASKS.md` sotto "Backlog futuro" invece di implementarla.
9. **Migrazioni Prisma sempre versionate.** Ogni modifica allo schema dati passa da `prisma migrate dev` con nome descrittivo, mai edit manuali del DB.
10. **Gestione esplicita degli errori esterni.** Chiamate a Strava API e a provider LLM devono gestire: timeout, rate limit (429), errori 5xx, con retry/backoff dove sensato e messaggi di errore chiari propagati alla UI (mai un errore generico silenzioso).

---

## 5. Convenzioni di codice

- **Naming file:** kebab-case per file, PascalCase per componenti React, camelCase per funzioni/variabili.
- **Commit:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`). Un commit = una unità logica coerente con un task di `TASKS.md`.
- **Branching:** un branch per task/epic (es. `feat/strava-oauth`, `feat/program-generation`), merge in `main` solo quando la definition of done è rispettata.
- **Formattazione/lint:** ESLint + Prettier configurati fin dal task di setup; nessun commit con errori di lint.
- **Commenti:** solo dove la logica non è auto-esplicativa (es. formule metriche, euristiche di matching workout↔activity). Non commentare l'ovvio.
- **Server actions vs API routes:** preferire server actions per mutazioni invocate da UI interna; usare API routes (`/app/api`) per webhook esterni (Strava) e per endpoint che devono essere chiamati da job/cron.

---

## 6. Variabili d'ambiente attese

Da definire in `.env.example` fin dal primo task di setup, includendo almeno:

```
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_WEBHOOK_VERIFY_TOKEN=
ENCRYPTION_KEY=            # per cifrare i token Strava at-rest
LLM_PROVIDER=deepseek      # deepseek | openai
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
SENTRY_DSN=                # opzionale
```

Non committare mai `.env` reale. Aggiornare `.env.example` ogni volta che si introduce una nuova variabile.

---

## 7. Definition of Done per un task

Un task in `TASKS.md` si considera completo solo se:

1. Il codice compila senza errori TypeScript e passa il lint.
2. Le eventuali migrazioni Prisma sono create e applicate.
3. Esiste almeno un test (unit o integration) per la logica non banale introdotta (in particolare: calcolo metriche, parsing output LLM, matching workout↔activity, gestione token Strava).
4. La feature è verificabile manualmente end-to-end nell'ambiente di sviluppo (non solo "il codice esiste").
5. Il task corrispondente in `TASKS.md` viene marcato come completato.
6. Se il task introduce una nuova variabile d'ambiente, `.env.example` è aggiornato.

---

## 8. Testing

- **Unit test** per: calcolo TSS/CTL/ATL/TSB, stima FTP/VDOT/soglia nuoto, validazione/parsing output LLM, logica di matching workout↔activity.
- **Integration test** per: flusso OAuth Strava (con mock), webhook di sync, generazione programma end-to-end (con provider LLM mockato).
- Framework consigliato: **Vitest** per unit/integration, **Playwright** se/quando servirà E2E sull'interfaccia (non prioritario in MVP ma da tenere in considerazione nella struttura).
- Mock dei provider esterni (Strava API, OpenAI, DeepSeek) obbligatorio nei test — nessun test deve fare chiamate reali a servizi esterni.

---

## 9. Come lavorare con `TASKS.md`

- Esegui i task **nell'ordine delle fasi indicate**, salvo dipendenze esplicitamente diverse indicate nel file stesso.
- Prima di iniziare una fase, rileggi la sezione corrispondente in `PROJECT_SPEC.md`.
- Se un task risulta ambiguo, fai la scelta più semplice coerente con lo scope MVP descritto in `PROJECT_SPEC.md` §2.1, e annota l'assunzione fatta in un commento nel task stesso o nel commit.
- Non anticipare feature della sezione "Futuro" (`PROJECT_SPEC.md` §2.2) anche se sembrano facili da aggiungere ora — tienile nel backlog.

---

## 10. Comandi principali (da confermare/aggiornare al setup)

```
npm run dev              # avvio ambiente sviluppo
npm run build             # build produzione
npm run lint               # lint
npm run test                # unit + integration test
npx prisma migrate dev      # nuova migrazione in sviluppo
npx prisma studio             # ispezione DB locale
```

Aggiorna questa sezione se durante il setup i comandi reali differiscono.
