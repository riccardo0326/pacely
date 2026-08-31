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

- [ ] Vista calendario settimanale/mensile con workout pianificati.
- [ ] Logica di matching automatico Workout ↔ Activity (euristica su data/sport/durata simile).
- [ ] UI per correggere manualmente un match errato/mancante.
- [ ] Stato workout: `planned` / `completed` / `skipped`, aggiornato automaticamente al match.
- [ ] Vista di confronto pianificato vs effettivo (per singolo workout e a livello settimanale).
- [ ] Test unit: euristica di matching su casi ambigui (più attività stesso giorno, sport multipli).

---

## Fase 7 — Feedback e ricalcolo adattivo

- [ ] Modello `WorkoutFeedback` in Prisma + migrazione.
- [ ] UI per inserire feedback testuale libero dopo un workout completato.
- [ ] Chiamata `LLMProvider.analyzeFeedback` per estrarre dati strutturati (RPE percepito, fattori esterni, scostamento dal piano).
- [ ] Logica finestra di calibrazione: 2 settimane se programma ≤8 settimane, 3 settimane se 10-12 settimane (parametrizzata, non hardcoded per ogni caso).
- [ ] Modello `RecalcProposal` in Prisma + migrazione.
- [ ] Generazione proposta di modifica (diff sui workout futuri) quando il feedback, all'interno della finestra di calibrazione, indica scostamento significativo.
- [ ] UI di approvazione/rifiuto della proposta di ricalcolo (mai applicata automaticamente).
- [ ] Applicazione delle modifiche approvate ai `Workout` futuri interessati.
- [ ] Test integration: feedback con scostamento forte dentro la finestra → proposta generata; stesso scenario fuori finestra → nessuna proposta, solo salvataggio feedback.

---

## Fase 8 — Report performance periodico

- [ ] Modello `PerformanceReport` in Prisma + migrazione.
- [ ] Chiamata `LLMProvider.analyzePerformance` con input: trend metriche + feedback raccolti nel periodo.
- [ ] Job/cron per generazione periodica automatica (configurabile) + possibilità di generazione on-demand.
- [ ] UI di visualizzazione report (sintesi punti di forza / aree di miglioramento / suggerimenti).
- [ ] Test integration: generazione report con dati mock, verifica che il contenuto salvato sia coerente con l'input.

---

## Fase 9 — Notifiche

- [ ] Modello `Notification` in Prisma + migrazione.
- [ ] Setup Web Push (service worker, chiavi VAPID) per notifiche browser.
- [ ] Notifica in-app + push per "allenamento di oggi" (cron giornaliero).
- [ ] Notifica per proposta di ricalcolo in attesa di approvazione.
- [ ] Centro notifiche in-app (lista, stato letta/non letta).
- [ ] Test: job di invio notifiche giornaliere con mock del servizio push.

---

## Fase 10 — Polish, QA, deploy per test con amici

- [ ] Revisione UX end-to-end del flusso completo: login → import → dashboard → creazione programma → calendario → feedback → report.
- [ ] Gestione stati vuoti (nessuna attività, nessun programma ancora creato, ecc.).
- [ ] Gestione errori visibile all'utente (import fallito, generazione LLM fallita, ecc.) — mai schermate bianche o errori generici.
- [ ] Verifica isolamento dati tra utenti diversi (test manuale con più account demo).
- [ ] Controllo consumo/costo LLM stimato su uno scenario d'uso realistico (via `LLMInteractionLog`), documentare risultato.
- [ ] README con istruzioni setup locale, variabili ambiente, procedura registrazione app Strava.
- [ ] Deploy finale su Vercel con dominio/URL condivisibile con gli amici beta tester.
- [ ] Raccolta feedback iniziale strutturata (anche solo un form o un canale dedicato) per iterazioni successive.

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
