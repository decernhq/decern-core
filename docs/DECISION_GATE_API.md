# Decision Gate API (MVP)

Endpoint di validazione per CI/CD: verifica se una decisione esiste ed è in stato **approved**. Con piano **Free** la CI è in modalità observation only: il gate restituisce sempre `200` (la pipeline non fallisce); il body non include `status`.

## Piano e comportamento

- **Piano Free:** observation only — risposta sempre `200` con `valid`, `decisionId`, `adrRef`, `hasLinkedPr`. Non viene incluso `status`; la CI non deve far fallire la pipeline.
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
| 200 | `{ "valid": true, "decisionId": "<uuid>", "adrRef": "<adr_ref>", "hasLinkedPr": bool, "status": "approved" }` | Decisione trovata e approvata (piano a pagamento). |
| 200 | `{ "valid": true, "decisionId": "<uuid>", "adrRef": "<adr_ref>" }` | Piano Free (observation only); nessun `hasLinkedPr` né `status`, CI non deve fallire. |
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
