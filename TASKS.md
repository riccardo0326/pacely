# TASKS.md — Roadmap Pacely (MVP)

Ordine di esecuzione consigliato per fasi. Ogni task va completato secondo la "Definition of Done" in `.cursor/rules/conventions.mdc`. Le fasi sono sequenziali; all'interno di una fase, i task senza dipendenze esplicite possono essere paralleli.

Legenda: `[ ]` da fare · `[x]` completato · `(dep: ...)` dipendenza da altro task.

---

## Fase 0 — Setup progetto

- [x] Inizializzare repo Next.js 14+ (App Router) con TypeScript strict.
- [x] Configurare ESLint + Prettier + husky (pre-commit lint).
- [x] Configurare Tailwind CSS + installare/inizializzare shadcn/ui.
- [x] Setup Prisma con connessione a Postgres su Neon (creare progetto Neon, DB dev).
- [x] Creare `.env.example` con tutte le variabili note (vedi `.cursor/rules/conventions.mdc`).
- [x] Setup Vitest (unit + integration) con configurazione base e primo test smoke.
- [x] Setup Sentry (opzionale ma consigliato da subito) per error tracking.
- [x] Configurare deploy iniziale su Vercel (progetto collegato, env vars configurate, deploy "hello world" funzionante).

Assunzioni Fase 0: Prisma 6.19 (non la CLI v8 RC). Neon progetto `soft-sound-52896127` (org Riccardo): `DATABASE_URL` pooled + `DATABASE_URL_UNPOOLED` per Prisma `directUrl` (`neon env pull`). Sentry è no-op senza `SENTRY_DSN`. Deploy Vercel collegato.

---

## Fase 1 — Autenticazione e connessione Strava

- [x] Registrare applicazione su Strava API (client id/secret) e documentare procedura in README.
- [x] Implementare Auth.js con provider custom Strava OAuth (login/logout).
- [x] Modello `User` e `StravaConnection` in Prisma (con token cifrati at-rest) + prima migrazione.
- [x] Implementare cifratura/decifratura token Strava (`lib/strava` o `lib/security`).
- [x] Implementare refresh automatico access token Strava (gestione scadenza 6h).
- [x] Middleware/route protection: pagine dashboard accessibili solo autenticati.
- [x] Pagina di login con bottone "Connetti con Strava" (UI minima ma funzionante).
- [x] Test integration: flusso OAuth completo con mock delle risposte Strava.

Assunzioni Fase 1: Auth.js v5 (`next-auth@5.0.0-beta.32`) per App Router. Sessioni JWT (niente tabelle Account/Session). `role` è stringa (`athlete`) per restare estendibile. Callback Strava: `/api/auth/callback/strava`.

---

## Fase 2 — Import storico e sync attività

- [x] Modello `Activity` in Prisma (campi come da `PROJECT_SPEC.md` §7) + migrazione.
- [x] Client Strava API in `lib/strava` (fetch attività, gestione paginazione, gestione rate limit 200/15min - 2000/day con backoff).
- [x] Job di backfill storico iniziale alla prima connessione (coda semplice, es. tabella `Job` con stato `pending/running/done/failed`).
- [x] UI di stato import ("stiamo importando il tuo storico...") con indicatore di progresso.
- [x] Endpoint webhook Strava (`/app/api/strava/webhook`) per eventi create/update/delete attività, con verifica del token di sicurezza.
- [x] Cron job di fallback (polling periodico) nel caso il webhook non arrivi (Vercel Cron).
- [x] Test unit: parsing/normalizzazione payload Strava → modello `Activity`.
- [x] Test integration: webhook riceve evento → attività salvata correttamente.

Assunzioni Fase 2: il backfill usa l'elenco attività Strava (summary), non gli stream; il webhook fetcha il dettaglio della singola attività. Sport importati: run/trail/virtual run, ride/gravel/mtb/virtual, swim/open water (e-bike esclusa). Il dashboard processa i chunk di backfill così l'import non dipende dal cron. Su Vercel Hobby il cron gira 1 volta/giorno; in dashboard c'è "Sincronizza ora". Registrazione webhook Strava è manuale (vedi README).

---

## Fase 3 — Motore metriche

- [x] Implementare calcolo TSS unificato per sport (`lib/metrics`): rTSS (corsa), bikeTSS (potenza o stima FC/pace), sTSS (nuoto).
- [x] Implementare calcolo CTL/ATL/TSB (media mobile esponenziale, 42gg/7gg) aggregato multi-sport.
- [x] Implementare stima FTP (da attività con potenza; fallback se assente).
- [x] Implementare stima VDOT (corsa) da performance recenti.
- [x] Implementare stima soglia di nuoto (passo/100m).
- [x] Implementare calcolo zone di intensità derivate (FC/passo/potenza) per ciascuno sport.
- [x] Modello `PerformanceMetricSnapshot` in Prisma + migrazione.
- [x] Job di ricalcolo metriche triggerato da nuova attività sincronizzata (collegato al webhook/job di Fase 2).
- [x] Dashboard base: grafico CTL/ATL/TSB nel tempo, metriche correnti (FTP/VDOT/soglia nuoto).
- [x] Test unit estesi su tutte le formule di calcolo (casi limite: nessuna attività, dati mancanti, un solo sport praticato).

Assunzioni Fase 3: solo summary Strava (niente stream). bikeTSS da NP/`weighted_average_watts` o `average_watts` vs FTP (95% del miglior NP su sforzi ≥20 min, 90gg); senza potenza: FC vs LTHR (85% max HR osservato), poi RPE, poi IF fisso 0.75. rTSS: IF = velocità grade-adjusted (8 m extra per metro di dislivello) / T-pace da VDOT Daniels. sTSS vs CSS (passo più veloce su nuoti ≥400 m e ≥8 min). FTP assente se non c'è potenza (niente stima watt da FC). PMC con giorni di riposo (TSS 0) da prima attività a oggi. Grafico SVG senza libreria chart. Ricalcolo sincrono dopo webhook/sync/chunk backfill; errori di recalc non fanno fallire lo sync.

---

## Fase 4 — Astrazione LLM

- [x] Definire interfaccia comune `LLMProvider` in `lib/llm` (generateProgram, analyzeFeedback, analyzePerformance).
- [x] Implementare `DeepSeekProvider`.
- [x] Implementare `OpenAIProvider`.
- [x] Selezione provider via `LLM_PROVIDER` env var, con possibilità di override per singola chiamata.
- [x] Modello `LLMInteractionLog` in Prisma (tracking token usage/costo stimato) + migrazione.
- [x] Wrapper con validazione Zod dell'output di ogni chiamata + logica di retry (max 1-2 tentativi) su fallimento parsing.
- [x] Fallback esplicito e gestito (mai crash silenzioso) se il provider fallisce ripetutamente.
- [x] Test unit: mock dei provider, verifica che output non conforme allo schema venga gestito correttamente (retry/fallback).

Assunzioni Fase 4: implementata su richiesta prima della Fase 3 (l'astrazione non dipende dal motore metriche; CTL/FTP/VDOT restano campi di input). Chat Completions via `fetch` (API compatibile OpenAI), senza SDK. Modelli: `deepseek-chat`, `gpt-4o-mini`. Retry parsing: 1 (2 tentativi totali). HTTP 429/5xx: fino a 2 retry con backoff. Fallback algoritmico esplicito (`source: "fallback"`); il feedback fallback non inventa l'RPE. Costo stimato da listini statici in `lib/llm/constants.ts`. Rate limit generate/regenerate: 5 chiamate/utente/ora (Fase 5, `lib/llm/quota.ts`).

---

## Fase 5 — Creazione programmi (generazione + editor manuale)

- [x] Modelli Prisma: `Program`, `Goal`, `Week`, `Workout` (struttura a blocchi in JSON) + migrazioni.
- [x] Form di creazione programma: sport inclusi (1-3), obiettivo (`race` con data/distanza o `generic`), durata settimane, giorni/orari disponibili, vincoli testuali liberi (es. infortuni).
- [x] Endpoint/server action `generateProgram`: raccoglie input utente + metriche correnti + storico aggregato, chiama `LLMProvider.generateProgram`.
- [x] Logica di calcolo del "budget di carico settimanale" (TSS target) da passare come vincolo al generatore, basata su CTL attuale e progressione ragionevole.
- [x] Parsing e validazione Zod dell'output LLM → salvataggio in `Program`/`Week`/`Workout`.
- [x] UI di visualizzazione programma generato (timeline settimane, workout per giorno).
- [x] Editor manuale del singolo workout (modifica blocchi: warm-up/main set/cool-down, target zona).
- [x] Funzione "rigenera programma" (nuova chiamata LLM con eventuali input aggiornati).
- [x] Test integration: creazione programma end-to-end con provider LLM mockato, verifica bilanciamento carico tra sport nel JSON generato.

Assunzioni Fase 5: generazione via server action (non API route pubblica). Budget TSS = CTL×1.05 (cap 120–600). Storico settimanale da `PerformanceMetricSnapshot.sportBreakdown` se presente, altrimenti stima durata×60. Quota 5 generate/regenerate LLM per utente/ora (`LLMInteractionLog`). Editor blocchi: tipo, durata, descrizione, zona 1–5, metrica hr/pace/power; persistenza Zod. Rigenera riusa sport/goal/slot del programma esistente. Output LLM riparato in codice prima del save: slot (giorno/orario) e sport del form sono vincoli duri; i vincoli testuali (es. evitare salita) vengono scrubbati. Prompt utente a sezioni (SPORT / SLOT / VIETATO), non un JSON blob. Export Excel `.xlsx` dal dettaglio programma (fogli Riepilogo + Allenamenti).

---

## Fase 6 — Calendario e tracking pianificato vs effettivo

- [x] Vista calendario settimanale/mensile con workout pianificati.
- [x] Logica di matching automatico Workout ↔ Activity (euristica su data/sport/durata simile).
- [x] UI per correggere manualmente un match errato/mancante.
- [x] Stato workout: `planned` / `completed` / `skipped`, aggiornato automaticamente al match.
- [x] Vista di confronto pianificato vs effettivo (per singolo workout e a livello settimanale).
- [x] Test unit: euristica di matching su casi ambigui (più attività stesso giorno, sport multipli).

Assunzioni Fase 6: matching solo sullo stesso giorno UTC (stesso sport, durata entro 40% o 15 min). Un'attività è unica per workout (`activityId` unique). Un override manuale (`matchSource: manual`) non viene sovrascritto dal rematch automatico. Workout pianificati senza match dopo 2 giorni diventano `skipped` e restano riabbinabili se arriva un'attività tardiva. Solo programmi `active` nel calendario. TSS effettivo stimato dalle soglie dell'ultimo snapshot.

---

## Fase 7 — Feedback e ricalcolo adattivo

- [x] Modello `WorkoutFeedback` in Prisma + migrazione.
- [x] UI per inserire feedback testuale libero dopo un workout completato.
- [x] Chiamata `LLMProvider.analyzeFeedback` per estrarre dati strutturati (RPE percepito, fattori esterni, scostamento dal piano).
- [x] Logica finestra di calibrazione: 2 settimane se programma ≤8 settimane, 3 settimane se 10-12 settimane (parametrizzata, non hardcoded per ogni caso).
- [x] Modello `RecalcProposal` in Prisma + migrazione.
- [x] Generazione proposta di modifica (diff sui workout futuri) quando il feedback, all'interno della finestra di calibrazione, indica scostamento significativo.
- [x] UI di approvazione/rifiuto della proposta di ricalcolo (mai applicata automaticamente).
- [x] Applicazione delle modifiche approvate ai `Workout` futuri interessati.
- [x] Test integration: feedback con scostamento forte dentro la finestra → proposta generata; stesso scenario fuori finestra → nessuna proposta, solo salvataggio feedback.

Assunzioni Fase 7: un feedback per workout. Finestra di calibrazione sulla data pianificata del workout rispetto a `program.startDate` (programmi di 9 settimane usano 2 settimane). Proposta solo se `planDeviation === "significant"`; il diff è algoritmico da `suggestedAction` (non una seconda chiamata LLM). Al massimo una proposta `pending` per programma. Quota 20 analisi feedback/utente/ora. Rigenerare un programma elimina le proposte esistenti.

---

## Fase 8 — Report performance periodico

- [x] Modello `PerformanceReport` in Prisma + migrazione.
- [x] Chiamata `LLMProvider.analyzePerformance` con input: trend metriche + feedback raccolti nel periodo.
- [x] Job/cron per generazione periodica automatica (configurabile) + possibilità di generazione on-demand.
- [x] UI di visualizzazione report (sintesi punti di forza / aree di miglioramento / suggerimenti).
- [x] Test integration: generazione report con dati mock, verifica che il contenuto salvato sia coerente con l'input.

Assunzioni Fase 8: `content` è JSON `PerformanceReportOutput` (summary/strengths/improvements/suggestions), non testo libero. Finestra default 14 giorni inclusivi, configurabile con `REPORT_PERIOD_DAYS` (14–28); on-demand offre 2 o 4 settimane. Cron giornaliero `GET /api/cron/performance-reports` (06:00 UTC) genera solo se l'ultimo report è più vecchio del periodo e ci sono snapshot o feedback; max 5 utenti per run. Quota on-demand 5 report/utente/ora. Il report è informativo e non modifica il piano. `source`: `scheduled` | `on_demand`.

---

## Fase 9 — Notifiche

- [x] Modello `Notification` in Prisma + migrazione.
- [x] Setup Web Push (service worker, chiavi VAPID) per notifiche browser.
- [x] Notifica in-app + push per "allenamento di oggi" (cron giornaliero).
- [x] Notifica per proposta di ricalcolo in attesa di approvazione.
- [x] Centro notifiche in-app (lista, stato letta/non letta).
- [x] Test: job di invio notifiche giornaliere con mock del servizio push.

Assunzioni Fase 9: `Notification` ha `title`/`body`/`href`/`readAt`/`dedupeKey` (idempotenza). Tabella extra `PushSubscription` per gli endpoint Web Push (non in spec §7, necessaria per VAPID). Tipi: `workout_today` e `recalc_proposal`. Cron `GET /api/cron/notifications` alle 07:00 UTC (mattina IT); max 50 utenti/run; "oggi" in UTC come le date workout. Push opzionali (`web-push` + `public/sw.js`); senza chiavi VAPID restano solo le in-app. Le push iOS Safari richiedono PWA sulla Home (limite noto). Un fallimento push non blocca la notifica in-app né il salvataggio del feedback.

---

## Fase 10 — Polish, QA, deploy per test con amici

- [x] Revisione UX end-to-end del flusso completo: login → import → dashboard → creazione programma → calendario → feedback → report.
- [x] Gestione stati vuoti (nessuna attività, nessun programma ancora creato, ecc.).
- [x] Gestione errori visibile all'utente (import fallito, generazione LLM fallita, ecc.) — mai schermate bianche o errori generici.
- [x] Verifica isolamento dati tra utenti diversi (test manuale con più account demo).
- [x] Controllo consumo/costo LLM stimato su uno scenario d'uso realistico (via `LLMInteractionLog`), documentare risultato.
- [x] README con istruzioni setup locale, variabili ambiente, procedura registrazione app Strava.
- [x] Deploy finale su Vercel con dominio/URL condivisibile con gli amici beta tester.
- [x] Raccolta feedback iniziale strutturata (anche solo un form o un canale dedicato) per iterazioni successive.

Assunzioni Fase 10: error boundary `app/error.tsx` + `global-error.tsx` + `not-found.tsx` (niente schermata bianca). Errori LLM/import mappati a copy italiana in `lib/errors/user-facing.ts` (niente leak di messaggi interni). Isolamento verificato con test automatici che assertano `where.userId` della sessione su program/report/notification/workout/proposta/feedback (`tests/unit/user-isolation.test.ts`); un test manuale a due account Strava resta la checklist beta. Costo LLM documentato da scenario conservativo DeepSeek in `lib/llm/usage-scenario.ts` (~$0.025/atleta/mese). Feedback beta in tabella `BetaFeedback` + pagina `/feedback`. URL produzione: [https://pacely-rouge.vercel.app](https://pacely-rouge.vercel.app) (aggiornare Strava Authorization Callback Domain su `pacely-rouge.vercel.app`). Il polish di questa fase va in produzione al prossimo deploy da `main`.

---

## Backlog futuro (esplicitamente fuori scope MVP)

Da non implementare ora — annotare qui eventuali idee emerse durante lo sviluppo, non realizzarle:

- [ ] Ruolo Coach: gestione multi-atleta, sistema di inviti, dashboard aggregata.
- [ ] Utenti con doppio ruolo atleta+coach.
- [ ] Autenticazione email/password indipendente da Strava.
- [ ] Feedback vocale con trascrizione automatica (Whisper o equivalente).
- [ ] Ricalcolo del piano completamente automatico (senza approvazione utente).
- [ ] Export/push programmi verso Strava.
- [ ] Eval live qualità generazione LLM (script opzionale fuori CI, dopo repair deterministico).
- [ ] Notifiche push native mobile / app mobile dedicata.
- [ ] Provider LLM aggiuntivi (Anthropic, Google) nell'astrazione già predisposta.
- [ ] Eventuali piani di abbonamento / monetizzazione.
