# Decern v2 — Design Document

## Principio guida

Decern propone ADR solo in momenti sincroni col tech lead (bootstrap, drift report). In CI, Decern solo valuta contro ADR esistenti. Non crea, non genera, non propone in tempo reale.

---

## 1. Formato ADR (`protocol/`)

### File: `protocol/src/adr/format.ts`

Frontmatter YAML + body markdown. Parsing con un parser YAML minimale (già in uso: il protocol ha `parseAdrMarkdown`). Lo riscrivo per il nuovo formato.

```yaml
---
id: ADR-001
title: Use Zod for API input validation
status: approved          # proposed | approved | superseded | rejected
enforcement: blocking     # blocking | warning
scope:
  - src/api/**
  - src/middleware/**
supersedes: null
date: 2026-04-10
---

## Context
...

## Decision
...

## Consequences
...
```

Campi obbligatori: `id`, `title`, `status`, `enforcement`.
Campi opzionali: `scope` (array di glob patterns), `supersedes`, `date`.

### File: `protocol/src/adr/scope-match.ts`

Pre-filtro: dato un array di file path (dal diff) e un array di scope patterns (dalla ADR), ritorna true se almeno un file matcha almeno un pattern. Usa glob matching minimale (*, **, ?). Se la ADR non ha scope, matcha tutto (viene sempre valutata dall'LLM).

### File: `protocol/src/adr/verdict.ts`

```typescript
type VerdictCase = "A" | "B" | "C";

interface GateVerdict {
  case: VerdictCase;
  exitCode: 0 | 1;
  adrsEvaluated: AdrEvaluation[];
  signals: CaseCSignal[];  // caso C: nuove decisioni non coperte
}

interface AdrEvaluation {
  adrId: string;
  adrHash: string;        // SHA-256 del contenuto
  result: "pass" | "violation" | "skipped";
  enforcement: "blocking" | "warning";
  reason: string;
}

interface CaseCSignal {
  description: string;
  filesInvolved: string[];
  suggestedAdrTitle: string;
}
```

---

## 2. Gate CLI (`gate/`)

### Ristrutturazione comandi

```
gate/src/
  bin.ts              # Entry point: routing comandi
  commands/
    init.ts           # decern init
    gate.ts           # decern gate (CI)
  adr/
    reader.ts         # Legge /docs/adr/*.md dal filesystem locale
    evaluator.ts      # Orchestration: pre-filter → LLM → verdict
  llm/
    client.ts         # Call LLM BYO (OpenAI-compatible, Anthropic)
    prompts.ts        # System/user prompts per matching e per init
  cloud/
    reporter.ts       # Manda risultati al cloud (evidence, signals)
  ci-metadata.ts      # Resta (detection CI provider)
```

### `decern init`

1. Scansiona la codebase:
   - Legge struttura cartelle (esclusi node_modules, dist, .git, etc.)
   - Legge manifesti: package.json, pyproject.toml, pom.xml, go.mod, Cargo.toml
   - Legge git log degli ultimi 6 mesi: `git log --oneline --since="6 months ago"` (titoli commit)
   - Legge PR titles se disponibili (git log --merges)
   - Legge README.md, docs/, eventuali ADR esistenti
   - Campiona file chiave: entry points, config files, middleware, routers

2. Compone un prompt per il LLM con tutto il contesto:
   ```
   System: You are an architecture analyst. Given the codebase context below,
   extract 15-25 implicit architectural decisions the team has clearly made
   but never written down. For each, produce a structured ADR in YAML+markdown format.
   
   User: [codebase context: tree, manifests, commit history, code samples]
   ```

3. Parsa la risposta LLM → array di ADR bozze

4. Per ciascuna bozza, chiede interattivamente al tech lead:
   - `[A]pprove  [M]odify  [S]kip  [L]ater` 
   - Se Approve: scrive il file in `/docs/adr/ADR-XXX.md`
   - Se Modify: apre in `$EDITOR` o mostra il testo per editing inline
   - Se Skip/Later: non scrive nulla

5. A fine init: sincronizza le ADR col cloud (POST batch di ADR al server per cache/indice)

### `decern gate`

1. Legge tutte le ADR da `/docs/adr/*.md` (solo quelle con `status: approved`)
2. Legge il diff: `git diff HEAD~1...HEAD` (o `CI_BASE_SHA...CI_HEAD_SHA`)
3. Estrae la lista dei file toccati
4. **Pre-filtro scope**: per ogni ADR, se ha `scope`, matcha i file toccati. Se nessun file matcha, skippa.
5. Per le ADR rimaste (matchano per scope o non hanno scope):
   - Chiama LLM BYO con prompt strutturato:
     ```
     System: You evaluate if a code diff respects, violates, or is unrelated to
     an architecture decision (ADR). Respond with JSON.
     
     User: 
     ## ADR
     [ADR content]
     
     ## Diff
     [diff content]
     
     Respond: {"result": "pass"|"violation"|"unrelated", "reason": "..."}
     ```
   - Accumula risultati per ogni ADR

6. **Valutazione caso C**: se il diff tocca file/pattern significativi e NESSUNA ADR lo copre (tutte "unrelated" o skipped per scope), genera un segnale caso C. Chiama LLM:
   ```
   System: This diff introduces changes not covered by any existing ADR.
   Describe what new architectural decision this might represent.
   
   User: [diff] [list of existing ADR titles for context]
   
   Respond: {"description": "...", "suggested_title": "..."}
   ```

7. **Composizione verdetto**:
   - Se almeno una ADR ha `result: "violation"` con `enforcement: "blocking"` → Caso B, exit 1
   - Se almeno una ADR ha `result: "violation"` con `enforcement: "warning"` e nessun blocking → Caso B, exit 0
   - Se ci sono segnali caso C → Caso C, exit 0
   - Altrimenti → Caso A, exit 0

8. **Report al cloud**:
   - POST `/api/gate/report` con: verdetto, ADR evaluations, segnali caso C, diff hash, PR metadata, CI metadata
   - Il cloud scrive l'evidence record e commenta sulla PR

### Environment variables

```
# Obbligatori
DECERN_LLM_BASE_URL=https://api.openai.com/v1
DECERN_LLM_API_KEY=sk-...
DECERN_LLM_MODEL=gpt-4o-mini

# Opzionali
DECERN_BASE_URL=https://app.decern.dev     # Cloud server
DECERN_CI_TOKEN=...                         # Auth col cloud
DECERN_ADR_DIR=docs/adr                     # Default: docs/adr
DECERN_GATE_TIMEOUT_MS=120000               # Timeout totale
CI_BASE_SHA=...                             # Override base commit
CI_HEAD_SHA=...                             # Override head commit
CI_PR_TITLE=...
CI_PR_URL=...
CI_PR_BODY=...
```

Note: `DECERN_BASE_URL` e `DECERN_CI_TOKEN` sono opzionali. Se non configurati, il gate gira standalone senza evidence e senza commenti PR. Funziona comunque come linter locale.

---

## 3. Cloud (`cloud/`)

### Nuovi endpoint

**POST `/api/gate/report`**
- Auth: Bearer CI_TOKEN
- Body: verdetto completo (caso, ADR evaluations, segnali C, metadata)
- Azioni:
  1. Scrive evidence record (hash chain, firma)
  2. Se caso B: commenta sulla PR via GitHub API
  3. Se caso C: commenta nudge sulla PR, salva segnali nel DB

**POST `/api/adr/sync`**
- Auth: Bearer CI_TOKEN
- Body: array di ADR (id, title, status, hash, scope)
- Azione: upsert nella tabella `adr_cache` (cache/indice)

### Endpoint deprecati (da rimuovere)

- `GET /api/decision-gate/validate`
- `POST /api/decision-gate/judge`

### GitHub PR commenting

Il cloud ha bisogno di un GitHub token per commentare sulle PR. Due opzioni:
- Il workspace ha una GitHub App installata (già supportato via `github_connections`)
- Il CI token include un `GITHUB_TOKEN` nel report che il cloud usa per commentare

Per v1: il gate manda `GITHUB_TOKEN` nel report, il cloud lo usa una tantum per commentare. Non lo salva.

### Nuova tabella: `case_c_signals`

```sql
CREATE TABLE public.case_c_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  pr_url text,
  pr_title text,
  description text NOT NULL,
  suggested_adr_title text,
  files_involved text[],
  status text NOT NULL DEFAULT 'open',  -- open | formalized | dismissed
  evidence_id uuid REFERENCES evidence_records(evidence_id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Nuova tabella: `adr_cache`

```sql
CREATE TABLE public.adr_cache (
  id text NOT NULL,               -- ADR-001
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL,
  enforcement text NOT NULL DEFAULT 'warning',
  scope text[],
  content_hash text NOT NULL,     -- SHA-256 del file
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id)
);
```

### Drift report

Il cloud calcola il drift report leggendo:
- `evidence_records` (quante volte ogni ADR è stata valutata, quante violazioni)
- `case_c_signals` (segnali aperti non formalizzati)
- `adr_cache` (quali ADR esistono)

Endpoint: `GET /api/drift-report?workspace=<id>`
Ritorna JSON che la dashboard renderizza. Esportabile in markdown.

---

## 4. Evidence record (aggiornamento schema)

Il record evidence cambia leggermente:

- `verdict`: `"pass" | "warn" | "block"` → resta
- `reason_code`: aggiornare enum con nuovi codici:
  - `PASS` — caso A
  - `PASS_NUDGE` — caso C
  - `ADR_VIOLATION_BLOCKED` — caso B blocking
  - `ADR_VIOLATION_WARNING` — caso B warning
  - `NO_ADRS_FOUND` — nessuna ADR nel repo
- `adrs_evaluated`: nuovo campo JSONB — array di `{adr_id, adr_hash, result, enforcement}`
- `case_c_signals`: nuovo campo JSONB — array di segnali (opzionale)
- Rimuovere: `decision_id`, `decision_version` → sostituiti da `adrs_evaluated`
- `judge_invocation` → rinominare a `llm_invocation` (non c'è più il "judge")

---

## 5. Core dashboard

### Rimuovere
- CRUD decisioni (pagine new/edit/detail/list delle decisioni)
- Pagina pricing con piani (già fatto)

### Aggiornare
- Pagina gate-runs: mostra verdetto A/B/C, ADR valutate, segnali caso C
- Nuovo: pagina "ADR Index" — lista delle ADR dal cache DB, read-only (la modifica si fa nel repo)
- Nuovo: pagina "Signals" — segnali caso C aperti, con opzione di dismiss
- Nuovo: pagina "Drift Report" — il report periodico per il tech lead

---

## 6. Cosa eliminare

### Gate CLI
- `extractDecisionIds()` e tutti i regex `decern:`, `DECERN-`, `/decisions/`, `ADR-`
- `validateRef()` — non chiama più il server per validare
- `callJudge()` — non esiste più il judge
- `required-patterns.ts` — il pre-filtro è ora basato su scope delle ADR, non su pattern hardcoded
- `verify-evidence.ts`, `export-bundle.ts` — restano

### Cloud
- `app/api/decision-gate/validate/route.ts`
- `app/api/decision-gate/judge/route.ts`
- `lib/judge-pricing.ts`, `lib/judge-usage.ts`, `lib/judge-billing.ts`
- `app/api/cron/bill-judge-usage/route.ts`

### Core
- `app/(dashboard)/dashboard/decisions/` (tutte le pagine CRUD)
- `components/decisions/` (tutti i componenti)
- `lib/queries/decisions.ts` (query CRUD)
- `lib/constants/decision-status.ts`

### Database
- Le tabelle `decisions`, `judge_gate_runs`, `judge_usage` restano per ora (backward compat)
- Le nuove feature usano `evidence_records`, `case_c_signals`, `adr_cache`

---

## 7. Ordine di implementazione

**Passo 1 — Protocol: nuovo formato ADR + scope matching**
- Riscrivere parser ADR con nuovo formato YAML
- Implementare scope-match (glob patterns)
- Tipi verdetto A/B/C
- Test unitari

**Passo 2 — Gate: `decern gate` riscritto**
- Lettore ADR da filesystem
- LLM client (BYO, OpenAI-compatible + Anthropic)
- Evaluator: pre-filter → LLM → verdetto
- Caso C detection
- Report al cloud
- Test

**Passo 3 — Gate: `decern init`**
- Scanner codebase (tree, manifesti, git log, code samples)
- Prompt composition per LLM
- Parsing risposta → bozze ADR
- CLI interattivo (approve/modify/skip)
- Sync col cloud
- Test

**Passo 4 — Cloud: nuovi endpoint**
- `POST /api/gate/report` (evidence + commenti PR)
- `POST /api/adr/sync` (cache ADR)
- GitHub PR commenting
- Tabelle `case_c_signals`, `adr_cache`
- Migration

**Passo 5 — Cloud: drift report**
- Calcolo report da evidence + signals + ADR cache
- Endpoint API
- Export markdown

**Passo 6 — Core: dashboard aggiornata**
- Rimuovere pagine CRUD decisioni
- Aggiornare gate-runs con verdetto A/B/C
- Nuove pagine: ADR Index, Signals, Drift Report

**Passo 7 — Cleanup**
- Rimuovere codice morto (validate, judge, decision CRUD)
- Aggiornare test suite QA
- Aggiornare docs

---

## 8. FOLLOW_UPS (non in questa spec)

- Rivedere claim compliance: SOC 2 > ISO 42001 > EU AI Act Art. 17 > NIST. Eliminare Art. 14. Task copywriting.
- GitLab CI / Bitbucket / Jenkins PR commenting (v1: solo GitHub)
- Dashboard drift report UI completa
- Deterministic checks come pre-filtro aggiuntivo (opzionale, post-v2)
