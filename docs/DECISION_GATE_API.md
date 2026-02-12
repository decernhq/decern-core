# Decision Gate API (MVP)

Endpoint di validazione per CI/CD: verifica se una decisione esiste ed è in stato **approved**. Con piano **Free** la CI è in modalità observation only: il gate restituisce sempre `200` (la pipeline non fallisce); il body non include `status`.

## Piano e comportamento

- **Piano Free:** observation only — risposta sempre `200` con `valid`, `decisionId`, `adrRef`. Non vengono inclusi `hasLinkedPR` né `status`; la CI non deve far fallire la pipeline.
- **Piani Team / Business / Enterprise / Governance:** enforcement — se la decisione non è approvata viene restituito `422`; quando è approvata il body include anche `status: "approved"`.

## Endpoint

- **Metodo:** `GET`
- **URL:** `/api/decision-gate/validate`
- **Query param:** `decisionId` (UUID della decisione) oppure `adrRef` (es. `ADR-001`) — almeno uno obbligatorio. Con `adrRef` la decisione viene cercata per workspace + riferimento ADR.

## Autenticazione

- **Header:** `Authorization: Bearer <token>`
- Il token è **per workspace**: si crea da **Dashboard → Workspace** (sezione "Token CI (Decision Gate)"). Solo il proprietario del workspace può generare o revocare il token. Il token in chiaro viene mostrato una sola volta alla generazione; in DB viene salvato solo l’hash.
- Se manca o non è valido per nessun workspace → `401` con `{ "valid": false, "reason": "unauthorized" }`.

## Risposte

| Status | Body | Significato |
|--------|------|-------------|
| 200 | `{ "valid": true, "decisionId": "<uuid>", "adrRef": "<adr_ref>", "hasLinkedPR": bool, "status": "approved" }` | Decisione trovata e approvata (piano a pagamento). |
| 200 | `{ "valid": true, "decisionId": "<uuid>", "adrRef": "<adr_ref>" }` | Piano Free (observation only); nessun `hasLinkedPR` né `status`, CI non deve fallire. |
| 401 | `{ "valid": false, "reason": "unauthorized" }` | Token mancante o non valido. |
| 404 | `{ "valid": false, "reason": "not_found" }` | Nessuna decisione con quell’id. |
| 422 | `{ "valid": false, "reason": "invalid_input" }` | `decisionId` vuoto, troppo lungo (>128) o caratteri non ammessi. |
| 422 | `{ "valid": false, "reason": "not_approved", "status": "<status>" }` | Decisione trovata ma non approvata (piano a pagamento: enforcement). |
| 500 | `{ "valid": false, "reason": "server_error" }` | Errore lato server (es. DB). |

## Validazione `decisionId`

- Obbligatorio, non vuoto.
- Lunghezza massima 128 caratteri.
- Caratteri ammessi: `[a-zA-Z0-9_-]` (compatibile con UUID).

## Sicurezza

- La lettura usa **Supabase Service Role** (bypass RLS), solo server-side.
- In risposta non vengono mai restituiti contenuti della decisione (progetto, workspace, autore).
- Token e `decisionId` non vanno loggati in chiaro.

## Esempio (curl)

```bash
export DECERN_CI_TOKEN="your-secret-token"
curl -s -H "Authorization: Bearer $DECERN_CI_TOKEN" \
  "https://your-app.vercel.app/api/decision-gate/validate?decisionId=550e8400-e29b-41d4-a716-446655440000"
```

## Variabili d’ambiente

- `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: richiesti per la lettura delle decisioni e il lookup del token per workspace.

## Test

```bash
npm run test
```

I test coprono: assenza auth, token errato, `decisionId` invalido/mancante, decisione non trovata, decisione non approvata, decisione approvata, errore server.

---

# Endpoint Judge (LLM as a judge)

Dopo la validazione (validate), il CLI **decern-gate** può chiamare l’endpoint **judge** per far valutare da un LLM se il **diff** inviato è coerente con la decisione referenziata (ADR o decision ID). Il judge usa **Claude 3.5 Sonnet** (Anthropic). Se sì la CI può passare; se no la gate blocca.

- **Metodo:** `POST`
- **URL:** `/api/decision-gate/judge` (path configurabile lato client con `DECERN_JUDGE_PATH`).
- **Autenticazione:** come per validate — header `Authorization: Bearer <DECERN_CI_TOKEN>`.
- **Piano richiesto:** Judge è disponibile solo per piani **Team** e superiori (Business, Enterprise, Governance). Il piano Free non può usare il Judge; in tal caso la risposta è `200` con `allowed: false` e `reason: "Judge is available on Team plan and above."`.

## Request body (JSON)

Il client invia **esattamente uno** tra `adrRef` e `decisionId` (non entrambi).

| Campo        | Tipo    | Descrizione |
|-------------|---------|-------------|
| `diff`      | string  | Diff unificato completo (`git diff base...head`), già filtrato lato client (esclusi binari/immagini e file con patch >1MB); dimensione massima 2 MB. |
| `truncated` | boolean | `true` se il client ha troncato il diff a 2 MB (il judge lavora su un diff potenzialmente parziale). |
| `baseSha`   | string  | Ref git base (es. `origin/main` o SHA). |
| `headSha`   | string  | Ref git head (es. `HEAD` o SHA). |
| `adrRef`    | string  | Presente **solo** se la decisione è un ADR (es. `ADR-002`). |
| `decisionId`| string  | Presente **solo** se la decisione è un UUID (non ADR). |

Esempio con ADR:

```json
{
  "diff": "diff --git a/src/app.ts b/src/app.ts\n--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1,3 +1,4 @@\n ...",
  "truncated": false,
  "baseSha": "origin/main",
  "headSha": "HEAD",
  "adrRef": "ADR-002"
}
```

Esempio con UUID:

```json
{
  "diff": "...",
  "truncated": false,
  "baseSha": "abc123",
  "headSha": "def456",
  "decisionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Response

Sempre **status 200 OK** (anche quando si blocca: il blocco è indicato da `allowed: false`).

| Campo    | Tipo    | Descrizione |
|----------|---------|-------------|
| `allowed`| boolean | `true` = il cambiamento è coerente con la decisione, la gate può passare; `false` = blocca la CI. |
| `reason` | string (opzionale) | Breve motivazione (per log o output CI). |

Esempi:

- Pass: `{"allowed": true, "reason": "Change aligns with ADR-002."}`
- Block: `{"allowed": false, "reason": "Diff introduces a new DB column not mentioned in the decision."}`

In caso di errore (token non valido, decisione non trovata, timeout LLM, errore di rete verso l’LLM): risposta **200** con `{"allowed": false, "reason": "<messaggio appropriato>"}` (fail-closed). In tutti i casi decern-gate considera la gate bloccata se `allowed` è `false`.

## Variabili d’ambiente (backend)

- `ANTHROPIC_API_KEY`: richiesta per le chiamate a Claude 3.5 Sonnet (API Anthropic). Chiave da [Console Anthropic](https://console.anthropic.com/).
- `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: come per validate (lettura decisioni e lookup token).

## Storico usage e addebito mensile

Ogni chiamata al judge che riceve una risposta valida da Claude viene registrata nella tabella **judge_usage** (per workspace e mese `YYYY-MM`): si salvano `input_tokens` e `output_tokens` restituiti dall’API Anthropic.

A **fine mese** si può addebitare l’usage del mese su Stripe chiamando l’endpoint di cron:

- **POST** `/api/cron/bill-judge-usage`
- **Header:** `Authorization: Bearer <CRON_SECRET>` (impostare `CRON_SECRET` in `.env`).
- **Query (opzionale):** `?period=YYYY-MM` (default: mese precedente).

L’endpoint:

1. Legge da `judge_usage` tutti i record del periodo con `billed_at` nullo.
2. Raggruppa per owner del workspace (utente che ha la subscription Stripe).
3. Per ogni owner con `stripe_customer_id`, calcola l’importo in centesimi (token × prezzo per 1M token) e crea una fattura Stripe con una riga “Judge usage YYYY-MM”.
4. Imposta `billed_at` sui record usati per evitare doppi addebiti.

Prezzi (centesimi per 1M token), configurabili in env:

- `JUDGE_BILLING_INPUT_CENTS_PER_1M` (default 840, ~8,40 €/1M input, 3× costo Anthropic).
- `JUDGE_BILLING_OUTPUT_CENTS_PER_1M` (default 4200, ~42 €/1M output, 3× costo Anthropic).

Esempio di chiamata (es. da cron il 1° del mese):

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "https://your-app.vercel.app/api/cron/bill-judge-usage"
```

## Sicurezza e protezione costi (Judge)

Per evitare abusi e perdite economiche sono attive le seguenti misure:

| Misura | Descrizione |
|--------|-------------|
| **Rate limit** | Massimo N richieste per workspace per minuto (default 60, env `JUDGE_RATE_LIMIT_PER_MINUTE`). Oltre il limite: `200` con `allowed: false`, `reason: "Rate limit exceeded. Try again later."` senza chiamare l’LLM. |
| **Billing obbligatorio** | Il workspace deve avere un owner con `stripe_customer_id` (pagamento configurato). Altrimenti: `allowed: false`, `reason: "Billing not set up. Add a payment method to use the Judge."`. |
| **Piano Team+** | Solo piani Team, Business, Enterprise o Governance possono usare il Judge. Piano Free: `allowed: false`, `reason: "Judge is available on Team plan and above."`. |
| **Billing idempotente** | Il cron di billing imposta `billed_at` solo per i workspace degli owner effettivamente fatturati con successo. Una seconda esecuzione per lo stesso periodo non crea doppie fatture. |
| **Pagamento fallito** | In caso di `invoice.payment_failed` su una fattura Judge (descrizione "Judge usage YYYY-MM"), il webhook Stripe resetta `billed_at` per quel customer/periodo così il cron può ritentare l’addebito. |
