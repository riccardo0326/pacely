# Pacely — Project Specification

**Versione:** 1.0 (MVP)
**Data:** Agosto 2026
**Stato:** Da avviare — nessuno sviluppo iniziato

---

## 1. Visione

Pacely è una webapp multi-sport (corsa, nuoto, ciclismo, triathlon) che permette a un atleta amatoriale di:

1. Collegare il proprio account Strava e importare l'intero storico allenamenti.
2. Ottenere metriche di carico ed performance calcolate automaticamente (non solo dati grezzi).
3. Creare programmi di allenamento verso un obiettivo (gara o generico) generati con l'aiuto di un LLM, che tiene conto dello storico, del carico attuale e dei vincoli dell'atleta.
4. Dare un feedback in linguaggio naturale dopo ogni allenamento, che nelle prime settimane del programma viene usato per **suggerire** (non applicare automaticamente) un ricalcolo del piano.
5. Ricevere un'analisi periodica delle proprie performance (cosa migliora, cosa no) generata da LLM.

Il differenziale rispetto a Strava/TrainingPeaks/Runna: la combinazione di (a) generazione di programmi realmente multi-sport con bilanciamento del carico tra discipline, e (b) un ciclo di feedback in linguaggio naturale che adatta il piano nelle settimane iniziali, con un costo di gestione LLM molto basso e nessun abbonamento richiesto per l'MVP.

---

## 2. Scope MVP vs Futuro

### 2.1 Incluso nell'MVP

- Multi-tenant, ma **solo ruolo "atleta"** (nessun coach in questa fase).
- Login **esclusivamente via Strava OAuth**.
- Import dell'intero storico attività da Strava (corsa, nuoto, ciclismo), con filtri lato app.
- Calcolo metriche: TSS unificato per sport, CTL/ATL/TSB aggregati, FTP stimato, VDOT (corsa), passo di soglia (nuoto), zone di intensità.
- Creazione programmi:
  - Multi-sport a scelta libera (1, 2 o 3 discipline → incluso triathlon).
  - Obiettivo finale sempre richiesto (gara con data, oppure obiettivo generico stile "migliora il 10K").
  - Generazione assistita da LLM (provider switchabile: OpenAI / DeepSeek) basata su storico, metriche, giorni disponibili, vincoli dichiarati.
  - Bilanciamento del carico complessivo tra le discipline (non 3 piani indipendenti).
  - Editor manuale per modificare i singoli workout generati (struttura a blocchi).
- Calendario allenamenti (vista settimanale/mensile), pianificato vs effettivo.
- Feedback testuale post-allenamento (input scritto in MVP; audio rimandato a fase futura).
- Ricalcolo **suggerito** (non automatico) del piano, attivo solo nelle prime 2 settimane per programmi ≤8 settimane, prime 3 settimane per programmi 10-12 settimane. L'utente deve approvare esplicitamente ogni modifica proposta.
- Analisi periodica delle performance via LLM (report leggibile: punti di forza, aree di miglioramento, trend).
- Notifiche (in-app + browser push) per allenamento del giorno.
- Deploy su infrastruttura cloud a costo minimo/free-tier.

### 2.2 Esplicitamente escluso dall'MVP (roadmap futura)

- Ruolo Coach (gestione multi-atleta, inviti, dashboard aggregata).
- Utenti "sia atleta che coach".
- Autenticazione alternativa (email/password) non legata a Strava.
- Feedback vocale con trascrizione automatica (Whisper o equivalenti).
- Ricalcolo automatico (senza approvazione) del piano.
- Export/push di programmi verso Strava (solo import in MVP).
- Notifiche push native mobile (solo web push in MVP).
- App mobile nativa.
- Piani di abbonamento / monetizzazione.
- Provider LLM aggiuntivi oltre OpenAI/DeepSeek (es. Anthropic, Google) — restano previsti nell'astrazione ma non attivati in MVP.

---

## 3. Utenti e Ruoli

- **MVP:** un solo ruolo, `athlete`. Ogni utente vede e gestisce solo i propri dati.
- **Futuro:** ruolo `coach` con associazione N atleti tramite sistema di inviti; un utente potrà avere entrambi i ruoli.
- Il modello dati va progettato fin da subito con un campo `role` estendibile e relazioni pensate per non richiedere migrazioni distruttive quando arriverà il coaching (vedi §7 Modello Dati).

---

## 4. Integrazione Strava

- **Auth:** OAuth 2.0 Strava, usato anche come identity provider dell'app (niente password separate).
- **Scope richiesti:** `read`, `activity:read_all` (per includere attività private), eventualmente `profile:read_all` per dati fisiologici base (peso, se disponibile).
- **Sync:**
  - Backfill iniziale dell'intero storico alla prima connessione (job asincrono, gestione rate limit Strava: 200 richieste/15 min, 2000/giorno per app).
  - Sync incrementale successiva tramite **Strava Webhooks** (eventi create/update/delete attività), con fallback a polling periodico se il webhook non è disponibile/fallisce.
  - Refresh token gestito automaticamente (Strava access token scade dopo 6h).
- **Dati importati per attività:** tipo sport, durata, distanza, dislivello, frequenza cardiaca (media/max/serie se disponibile), potenza (bici, se disponibile), passo/ritmo, cadenza, percepito sforzo se presente su Strava, data/ora, eventuali split.
- **Solo import**, nessuna scrittura su Strava in MVP.

---

## 5. Generazione e Gestione Programmi

### 5.1 Struttura di un programma

- Un **Program** ha: nome, obiettivo (goal), data obiettivo (se legato a gara), sport inclusi (1-3), durata in settimane, stato (draft/active/completed/archived).
- Un **Goal** può essere: `race` (con tipo gara, distanza, data) oppure `generic` (es. "migliora il tempo sui 10K", "aumenta FTP del 10%").
- Ogni programma è diviso in **Week**, ogni settimana in **Workout** per giorno/sport.
- Ogni **Workout** è strutturato a blocchi (warm-up, main set con ripetute/intervalli, cool-down), con target per zona (FC, passo, potenza) — struttura ispirata a formati standard (simile a TrainingPeaks/.zwo semplificato), per restare estendibile in futuro anche a export.

### 5.2 Generazione con LLM

- Input al modello: metriche correnti dell'atleta (CTL/ATL/TSB, FTP, VDOT, soglia nuoto), storico aggregato (non attività raw, per contenere i token — riepiloghi settimanali/mensili), sport selezionati, giorni/orari disponibili dichiarati dall'utente, obiettivo e data, eventuali infortuni/vincoli dichiarati.
- Output: JSON strutturato validato (schema fisso) che l'app traduce in Program → Week → Workout. Nessun testo libero non strutturato accettato come output finale (evita ambiguità di parsing).
- Il bilanciamento del carico tra discipline è gestito applicando la logica del TSS unificato: il generatore riceve un budget di carico settimanale target (in TSS aggregato, calcolato da progressione ragionevole rispetto al CTL attuale) e distribuisce tra le discipline scelte, evitando sovraccarico.
- L'utente può rigenerare, modificare manualmente i singoli workout dopo la generazione iniziale.

### 5.3 Feedback post-allenamento e ricalcolo adattivo

- Dopo ogni workout pianificato e completato (rilevato via sync Strava collegata al workout, con matching automatico per data/sport/durata simile), l'utente può lasciare un feedback testuale libero (es. "3 ore di sonno, uscito ieri sera, FC più alta del solito").
- Il feedback viene elaborato da LLM per estrarre: percezione soggettiva dello sforzo, fattori esterni rilevanti (sonno, stress, malattia, altro), eventuale scostamento significativo dal piano.
- **Solo nella finestra di calibrazione iniziale** (2 settimane se programma ≤8 settimane, 3 settimane se 10-12 settimane) l'elaborazione può produrre una **proposta di modifica** ai workout successivi (es. riduzione carico, spostamento giorno di riposo). La proposta è sempre presentata all'utente per approvazione esplicita prima di essere applicata — mai automatica in MVP.
- Fuori dalla finestra di calibrazione, il feedback viene comunque salvato e usato come contesto per l'analisi performance periodica, ma non genera proposte di ricalcolo automatiche.

### 5.4 Analisi performance (report periodico)

- Report generato via LLM su base periodica (configurabile, es. ogni 2-4 settimane o a richiesta), che riceve in input le metriche calcolate (trend CTL/ATL/TSB, progressione FTP/VDOT/soglia nuoto) e i feedback testuali raccolti.
- Output: sintesi leggibile in linguaggio naturale con punti di forza, aree di miglioramento, e suggerimenti (non modifica il piano automaticamente — è puramente informativo in MVP).

---

## 6. Metriche Calcolate

- **TSS unificato:** calcolo di uno score di carico comparabile tra corsa (rTSS), ciclismo (bikeTSS, basato su potenza se disponibile o FC/pace come fallback), nuoto (sTSS), per poter sommare il carico su un'unica scala.
- **CTL (Chronic Training Load), ATL (Acute Training Load), TSB (Training Stress Balance):** calcolate su base giornaliera con media mobile esponenziale standard (CTL 42gg, ATL 7gg), aggregate su tutti gli sport.
- **FTP stimato (ciclismo):** da attività con potenza, o stima indiretta se assente.
- **VDOT (corsa):** stimato da performance recenti (formula Daniels o equivalente).
- **Soglia di nuoto (passo/100m):** stimata da attività nuoto con passo costante prolungato.
- **Zone di intensità:** derivate da FTP/VDOT/soglia nuoto per ciascuno sport.

Tutte le metriche vengono ricalcolate in background quando arrivano nuove attività da Strava (via webhook).

---

## 7. Modello Dati (entità principali)

> Schema concettuale, dettaglio implementativo in Prisma schema nel repo.

- **User** — id, stravaAthleteId, nome, email (da Strava), role (`athlete`, estendibile a `coach` in futuro), createdAt.
- **StravaConnection** — userId, accessToken (cifrato), refreshToken (cifrato), expiresAt, scope, lastSyncAt.
- **Activity** — userId, stravaActivityId, sport (`run`/`swim`/`ride`), data, durata, distanza, dislivello, serie FC/potenza/passo (JSON o tabella dedicata se serve granularità), sourceRaw (payload originale Strava, per riprocessare in futuro).
- **PerformanceMetricSnapshot** — userId, data, CTL, ATL, TSB, FTP, VDOT, swimThresholdPace, per-sport breakdown.
- **Program** — userId, nome, sportIncluded (array), goalId, durataSettimane, stato, createdAt.
- **Goal** — programId, tipo (`race`/`generic`), disciplinaGara (se race), dataTarget, descrizione.
- **Week** — programId, numero, weekLoadTarget (TSS budget).
- **Workout** — weekId, sport, data pianificata, struttura a blocchi (JSON), stato (`planned`/`completed`/`skipped`), activityId collegata (se matched con Strava).
- **WorkoutFeedback** — workoutId, testoLibero, sentimentEstratto (JSON strutturato da LLM), createdAt.
- **RecalcProposal** — programId, weekIdInteressata, motivazione (da LLM), modificheProposte (JSON diff), stato (`pending`/`approved`/`rejected`), createdAt.
- **PerformanceReport** — userId, periodo, contenutoGenerato (testo), createdAt.
- **Notification** — userId, tipo, contenuto, stato (letta/non letta), scheduledAt.
- **LLMInteractionLog** — userId, tipo interazione, provider usato, tokenUsage, costoStimato, createdAt (per monitorare i costi).

---

## 8. Architettura Tecnica

### 8.1 Stack

| Layer | Scelta | Motivazione |
|---|---|---|
| Frontend + Backend | **Next.js 14+ (App Router), TypeScript** | Full-stack unico, API routes/server actions, deploy semplice, ottimo fit per MVP senza team dedicato al backend |
| Autenticazione | **Auth.js (NextAuth)** con provider Strava custom | OAuth Strava nativo come login, gestione sessione standard |
| Database | **PostgreSQL** su **Neon** (free tier) | Serverless, scalabile, free tier sufficiente per MVP/demo |
| ORM | **Prisma** | Type-safety, migrazioni gestite, buon fit con TS |
| UI | **Tailwind CSS + shadcn/ui** | Sviluppo rapido, componenti accessibili, personalizzabili |
| Data fetching client | **TanStack Query** | Cache, invalidazione, gestione stato server |
| Validazione | **Zod** | Validazione input API e output strutturato LLM |
| Job asincroni (sync Strava, ricalcolo metriche) | **Vercel Cron Jobs** + queue leggera (es. tabella `Job` con stato, oppure Upstash QStash free tier) | Evita infrastruttura pesante (no Redis/worker dedicato) mantenendo affidabilità |
| LLM | **Astrazione provider-agnostic**: OpenAI e DeepSeek, switchabili via config/env, selezionabili anche per singola chiamata | Costi contenuti (DeepSeek default per generazione/analisi massiva), OpenAI disponibile per task dove serve qualità extra o dove l'utente ha già credito |
| Notifiche | **Web Push API** (service worker) + notifiche in-app | Nessun costo, nessuna dipendenza da app store per l'MVP |
| Deploy | **Vercel** | Free tier generoso, integrazione nativa Next.js, cron incluso |
| Monitoring/log errori | **Sentry (free tier)** | Visibilità minima su errori in produzione durante i test con gli amici |

### 8.2 Astrazione LLM

Interfaccia comune tipo:

```
interface LLMProvider {
  generateProgram(input: ProgramGenerationInput): Promise<ProgramGenerationOutput>;
  analyzeFeedback(input: FeedbackInput): Promise<FeedbackAnalysisOutput>;
  analyzePerformance(input: PerformanceInput): Promise<PerformanceReportOutput>;
}
```

Implementazioni: `OpenAIProvider`, `DeepSeekProvider`. Selezione tramite variabile ambiente `LLM_PROVIDER` (default `deepseek` per contenere i costi) con possibilità di override per singola feature se in futuro si vuole usare un provider diverso per task diversi. Output sempre richiesto in **JSON strutturato validato con Zod**, con retry/fallback se il parsing fallisce.

### 8.3 Sicurezza

- Token Strava cifrati at-rest (es. tramite libreria di encryption su colonna DB, chiave in variabile ambiente/secret manager Vercel).
- Nessuna password gestita direttamente (auth delegata a Strava).
- Rate limiting sulle API interne che chiamano LLM (per evitare abusi/costi incontrollati).
- Log di utilizzo LLM per monitorare i costi (`LLMInteractionLog`).

---

## 9. Requisiti Non Funzionali

- **Costi:** MVP deve poter girare su free-tier (Vercel, Neon, Upstash) + solo costo variabile delle chiamate LLM (DeepSeek preferenziale per costo). Nessun abbonamento a servizi terzi richiesto.
- **Performance:** dashboard e calendario devono restare fluidi anche con storico Strava di alcuni anni (paginazione/aggregazione lato query, non caricare tutte le attività raw sempre).
- **Affidabilità sync:** gestione esplicita dei rate limit Strava, retry con backoff, coda per il backfill iniziale.
- **Testabilità:** l'app deve poter essere usata da un piccolo gruppo di amici in parallelo senza interferenze tra account (isolamento dati per `userId` verificato a livello di query).
- **Estendibilità:** modello dati e API pensati per non richiedere refactor pesanti quando si aggiungerà il ruolo coach.

---

## 10. Rischi e Vincoli Noti

- **Rate limit Strava API**: il backfill storico massivo su più utenti demo può richiedere tempo; da gestire con coda e comunicazione chiara all'utente ("stiamo importando il tuo storico").
- **Qualità output LLM strutturato**: serve validazione stretta (Zod) + retry, per evitare programmi malformati; da prevedere anche un fallback "generazione algoritmica semplice" se l'LLM fallisce ripetutamente.
- **Matching automatico Workout↔Activity**: l'abbinamento tra un workout pianificato e l'attività Strava corrispondente non è garantito al 100% (serve euristica su data/sport/durata, con possibilità per l'utente di correggere manualmente il match).
- **Costi LLM**: da monitorare fin da subito con `LLMInteractionLog`, per evitare sorprese quando più amici testano l'app in parallelo.
- **Web Push**: il supporto browser/OS per le notifiche push web varia (es. iOS Safari ha limitazioni); da documentare come limite noto dell'MVP.

---

## 11. Metriche di Successo dell'MVP

- Un utente riesce a: collegare Strava → vedere storico e metriche → creare un programma multi-sport con obiettivo → seguire il calendario → lasciare feedback → eventualmente approvare un ricalcolo → ricevere un report performance, senza intervento manuale del developer.
- L'app regge l'uso concorrente di un piccolo gruppo di beta tester (amici) senza errori bloccanti.
- Il costo LLM per utente/mese resta entro una soglia bassa e monitorabile (da definire empiricamente nei primi test, ma l'architettura deve permetterne il tracking preciso fin dal giorno 1).
