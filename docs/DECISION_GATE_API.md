# Decision Gate API (MVP)

CI/CD validation endpoint: it checks whether a decision exists and meets policy. Behaviour depends on plan and optional query params. Policies are evaluated in a fixed order.

## Policies (validate) — order of evaluation

1. **Enforcement** — Are we in blocking mode? If not (observation), the gate always returns `200` with minimal body; no further checks.
2. **Linked PR** — **Free / Team:** linking a PR to a decision is never required. **Business+:** the workspace can require it via `requireLinkedPR=true`; if so, the decision must have at least one linked PR, otherwise `422` `linked_pr_required`.
3. **Status** — (Team when `highImpact=true`; Business when `requireApproved=true`.) Decision must be **approved**; otherwise `422` `not_approved`.

### Per-plan summary

| Plan   | Linked PR      | Status              | Enforcement                                      |
|--------|----------------|---------------------|--------------------------------------------------|
| **Free**   | Not checked    | Not checked         | Always observation (never block). |
| **Team**   | Not checked    | Checked only when `highImpact=true` | Blocking only for High Impact Changes (`highImpact=true`). |
| **Business+** | Optional: require with `requireLinkedPR=true` | Optional: require with `requireApproved=true` (default) | Default on; disable with `enforce=false`.        |

## Endpoint

- **Method:** `GET`
- **URL:** `/api/decision-gate/validate`
- **Query params:**
  - `decisionId` (decision UUID) or `adrRef` (e.g. `ADR-001`) — at least one required. With `adrRef` the decision is looked up by workspace + ADR reference.
  - **Optional:** `highImpact` — `true` or `1`: on **Team**, enables blocking (require approved). Ignored on other plans.
  - **Optional:** `enforce` — `false` or `0`: on **Business+**, disables enforcement (observation). Default when omitted: `true`.
  - **Optional (Business+):** `requireLinkedPR` — `true` or `1`: decision must have at least one linked PR; otherwise `422` `linked_pr_required`. Default: `false`.
  - **Optional (Business+):** `requireApproved` — `false` or `0`: do not require decision to be approved. Default: `true`.

## Authentication

- **Header:** `Authorization: Bearer <token>`
- The token is **per workspace**: it is created from **Dashboard → Workspace** (section "CI Token (Decision Gate)"). Only the workspace owner can create or revoke the token. The plain token is shown only once at creation; only its hash is stored in the DB.
- If missing or invalid for every workspace → `401` with `{ "valid": false, "reason": "unauthorized" }`.

## Responses

| Status | Body | Meaning |
|--------|------|---------|
| 200 | `{ "valid": true, "decisionId": "<uuid>", "adrRef": "<adr_ref>", "observation": false, "status": "approved" }` | Decision found and approved (blocking mode). CI may pass. |
| 200 | `{ "valid": true, "decisionId": "<uuid>", "adrRef": "<adr_ref>", "observation": true, "status": "<status>" }` | Observation mode; `status` included for decern-gate to show warning if not approved. CI must not fail. |
| 401 | `{ "valid": false, "reason": "unauthorized" }` | Token missing or invalid. |
| 404 | `{ "valid": false, "reason": "not_found" }` | No decision with that id. |
| 422 | `{ "valid": false, "reason": "invalid_input" }` | `decisionId` empty, too long (>128) or invalid characters. |
| 422 | `{ "valid": false, "reason": "linked_pr_required" }` | Business+ with `requireLinkedPR=true` and decision has no linked PR. |
| 422 | `{ "valid": false, "reason": "not_approved", "status": "<status>" }` | Decision found but not approved when required (Team with highImpact=true, or Business+ with requireApproved=true). |
| 500 | `{ "valid": false, "reason": "server_error" }` | Server error (e.g. DB). |

## `decisionId` validation

- Required, non-empty.
- Maximum length 128 characters.
- Allowed characters: `[a-zA-Z0-9_-]` (UUID-compatible).

## Security

- Reads use **Supabase Service Role** (bypass RLS), server-side only.
- The response never includes decision contents (project, workspace, author).
- Token and `decisionId` must not be logged in plain text.

## Example (curl)

```bash
export DECERN_CI_TOKEN="your-secret-token"
curl -s -H "Authorization: Bearer $DECERN_CI_TOKEN" \
  "https://your-app.vercel.app/api/decision-gate/validate?decisionId=550e8400-e29b-41d4-a716-446655440000"
```

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: required for reading decisions and workspace token lookup.

## Tests

```bash
npm run test
```

Tests cover: missing auth, invalid token, invalid/missing `decisionId`, decision not found, decision not approved, decision approved, server error.

---

# Judge endpoint (LLM as a judge)

After validation (validate), the **decern-gate** CLI can call the **judge** endpoint to have an LLM evaluate whether the submitted **diff** is consistent with the referenced decision (ADR or decision ID). By default the **LLM is chosen and configured by the user** (BYO LLM) and sent in the request body. If BYO config is omitted, backend can fallback to server fair-use config via `OPEN_AI_API_KEY` (+ optional `OPEN_AI_MODEL`). **Decern does not store or retain BYO API keys**: they are used only for the single request.

- **Anthropic:** if `llm.baseUrl` is `https://api.anthropic.com` (with or without path, e.g. `https://api.anthropic.com/v1`), the backend uses the **native** Messages API (`POST /v1/messages`), with no gateway.
- **Other providers:** for any other URL (OpenAI, Together, OpenRouter, etc.) the backend uses the **OpenAI-compatible fallback** (`POST {baseUrl}/chat/completions`).

- **Method:** `POST`
- **URL:** `/api/decision-gate/judge` (path configurable client-side via `DECERN_JUDGE_PATH`).
- **Authentication:** same as validate — header `Authorization: Bearer <DECERN_CI_TOKEN>`.
- **Plans:** Judge is available on **all plans** (Free, Team, Business, Enterprise, Governance). On **Free** the Judge is always **advisory** (BYO LLM): the client must not fail the pipeline on `allowed: false`. On **Team** and **Business+** the Judge can **block** the CI when `allowed: false` if the workspace policy **Judge blocking** is on (default: on); when off, judge is advisory. Team can also configure **Judge tolerance (%)** from the Dashboard. The `advisory` field in the response reflects plan and workspace policy. On Free, no billing is required; on Team and above, a payment method must be configured.

## Request body (JSON)

The client sends **exactly one** of `adrRef` or `decisionId` (not both). `llm` is optional: when present, BYO config is used; when omitted, backend uses `OPEN_AI_API_KEY` fair-use fallback (if configured).

| Field        | Type    | Description |
|-------------|---------|-------------|
| `diff`      | string  | Full unified diff (`git diff base...head`), already filtered client-side (excluding binaries/images and files with patch >1MB); maximum size 2 MB. |
| `truncated` | boolean | `true` if the client truncated the diff to 2 MB (the judge may work on a partial diff). |
| `baseSha`   | string  | Git base ref (e.g. `origin/main` or SHA). |
| `headSha`   | string  | Git head ref (e.g. `HEAD` or SHA). |
| `adrRef`    | string  | Present **only** when the decision is an ADR (e.g. `ADR-002`). |
| `decisionId`| string  | Present **only** when the decision is a UUID (not ADR). |
| `llm`       | object  | **Optional.** User’s BYO LLM configuration (never stored). If omitted, backend fallback uses `OPEN_AI_API_KEY` (+ optional `OPEN_AI_MODEL`). See below. |

### `llm` object

| Field     | Type   | Description |
|----------|--------|-------------|
| `baseUrl`| string | API base URL. If it is `https://api.anthropic.com` the native Anthropic API is used; otherwise the OpenAI-compatible endpoint `{baseUrl}/chat/completions` is used. Examples: `https://api.openai.com/v1`, `https://api.anthropic.com`, `https://api.together.xyz/v1`. Must be HTTPS; only localhost may use `http`. |
| `apiKey` | string | API key for the LLM. Used only for this request, never stored or logged. For Anthropic it is sent as the `x-api-key` header. |
| `model`  | string | Model name (e.g. `gpt-4o-mini`, `claude-3-5-sonnet-20241022`). |

Example with ADR:

```json
{
  "diff": "diff --git a/src/app.ts b/src/app.ts\n--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1,3 +1,4 @@\n ...",
  "truncated": false,
  "baseSha": "origin/main",
  "headSha": "HEAD",
  "adrRef": "ADR-002",
  "llm": {
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini"
  }
}
```

Example with UUID:

```json
{
  "diff": "...",
  "truncated": false,
  "baseSha": "abc123",
  "headSha": "def456",
  "decisionId": "550e8400-e29b-41d4-a716-446655440000",
  "llm": {
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini"
  }
}
```

## Response

Always **status 200 OK** (even when the gate blocks: blocking is indicated by `allowed: false`).

| Field            | Type    | Description |
|------------------|---------|-------------|
| `allowed`        | boolean | `true` = the change meets the confidence threshold; `false` = below threshold or LLM judged not aligned. |
| `reason`         | string (optional) | Short explanation (for logs or CI output). |
| `advisory`       | boolean (optional) | **Advisory only** when true: the client must not fail the pipeline on `allowed: false`. Set for Free (always), or for Team/Business+ when the workspace policy has **Judge blocking** disabled. When absent/false (Team/Business+ with blocking on), the client may block the CI on `allowed: false`. |
| `confidence`     | number (optional) | Score 0–1 from the judge (e.g. 0.85 = 85%). The CLI can compare to `DECERN_JUDGE_MIN_CONFIDENCE` or the workspace tolerance. |
| `advisoryMessage`| string (optional) | When `allowed: true` but confidence &lt; 100%, a short note on what was not fully aligned. Always present in that case so the CLI can show “Passed at X%; advisory: …”. |

### Confidence and threshold

The LLM returns a **score** (0–100) and optional **advisoryNotes**. The backend applies a **threshold** to decide `allowed`:

- **Free:** always 80% (not configurable).
- **Team:** workspace **Judge tolerance (%)** if set (Dashboard → Workspace → Policies); otherwise 80%.
- **Business+:** workspace **Judge tolerance (%)** if set; if unset, 80%.

If score ≥ threshold → `allowed: true`. If score &lt; 100%, `advisoryMessage` is set from the LLM’s advisory notes so the CLI can show a “passed but consider…” message.

Examples:

- Pass (Team, blocking on): `{"allowed": true, "reason": "Change aligns with ADR-002.", "advisory": false, "confidence": 1}`
- Pass with advisory (e.g. 85%): `{"allowed": true, "reason": "Change aligns.", "advisory": true, "confidence": 0.85, "advisoryMessage": "Error handling could better match the decision."}`
- Block (Team/Business): `{"allowed": false, "reason": "Diff introduces a new DB column not mentioned in the decision.", "confidence": 0}` (no `advisory` or `advisory: false` → client can block CI)

On error (invalid token, decision not found, LLM timeout, network error to the LLM): response **200** with `{"allowed": false, "reason": "<appropriate message>"}` (fail-closed). When `advisory` is true, the client must not block the pipeline; when absent/false (Team/Business+ with Judge blocking on), the client may block on `allowed: false`.

## Environment variables (backend)

- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: same as validate (reading decisions and token lookup).
- `OPEN_AI_API_KEY` (optional): backend fair-use fallback when request body omits `llm`.
- `OPEN_AI_MODEL` (optional): model for fair-use fallback (default `gpt-4o-mini`).
- `JUDGE_FAIR_USE_TEAM_CAP_CENTS` (optional): monthly cap for server fair-use on Team (default `2000` = €20).
- `JUDGE_FAIR_USE_BUSINESS_CAP_CENTS` (optional): monthly cap for server fair-use on Business (default `3500` = €35).

## Usage history and monthly billing

Each judge call that receives a valid response from the LLM (configured by the user) may record tokens in the **judge_usage** table (per workspace and month `YYYY-MM`) when the provider returns `usage` (OpenAI-compatible: `prompt_tokens`, `completion_tokens`). Stripe billing is optional and configurable.

At **month end** you can bill that month’s usage to Stripe by calling the cron endpoint:

- **POST** `/api/cron/bill-judge-usage`
- **Header:** `Authorization: Bearer <CRON_SECRET>` (set `CRON_SECRET` in `.env`).
- **Query (optional):** `?period=YYYY-MM` (default: previous month).

The endpoint:

1. Reads from `judge_usage` all records for the period with `billed_at` null.
2. Groups by workspace owner (the user with the Stripe subscription).
3. For each owner with `stripe_customer_id`, computes the amount in cents (tokens × price per 1M tokens) and creates a Stripe invoice with one line “Judge usage YYYY-MM”.
4. Sets `billed_at` on the records used to avoid double billing.

Prices (cents per 1M tokens), configurable via env:

- `JUDGE_BILLING_INPUT_CENTS_PER_1M` (default 840, ~$8.40/1M input, 3× Anthropic cost).
- `JUDGE_BILLING_OUTPUT_CENTS_PER_1M` (default 4200, ~$42/1M output, 3× Anthropic cost).

Example call (e.g. from cron on the 1st of the month):

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "https://your-app.vercel.app/api/cron/bill-judge-usage"
```

## Security and cost protection (Judge)

To prevent abuse and cost overruns the following measures are in place:

| Measure | Description |
|--------|-------------|
| **Rate limit (workspace)** | Maximum N requests per workspace per minute (default 60, env `JUDGE_RATE_LIMIT_PER_MINUTE`). Above the limit: `200` with `allowed: false`, `reason: "Rate limit exceeded. Try again later."` without calling the LLM. |
| **Rate limit (owner)** | Maximum M requests per owner (account) per minute across all workspaces (default 120, env `JUDGE_RATE_LIMIT_PER_MINUTE_OWNER`). Same response when exceeded. Prevents circumventing the workspace limit by using multiple workspaces. |
| **Fair-use cap (server fallback)** | When BYO `llm` is omitted and backend uses `OPEN_AI_API_KEY`, Team is capped at €20/month and Business at €35/month by default (configurable via `JUDGE_FAIR_USE_TEAM_CAP_CENTS` and `JUDGE_FAIR_USE_BUSINESS_CAP_CENTS`). When cap is reached, response is advisory (`allowed: false`, `advisory: true`) and the LLM is not called. |
| **Billing required** | On **Team** and above, the workspace owner must have `stripe_customer_id` (payment configured). On **Free**, Judge is available without billing (BYO LLM, advisory). |
| **Plans** | Judge is available on Free (always advisory), Team and Business/Enterprise/Governance (can block when workspace **Judge blocking** is on). Unsupported plan: `allowed: false`, `reason: "Judge is not available for this plan."`. |
| **Idempotent billing** | The billing cron sets `billed_at` only for workspaces whose owners were successfully billed. A second run for the same period does not create duplicate invoices. |
| **Failed payment** | On `invoice.payment_failed` for a Judge invoice (description “Judge usage YYYY-MM”), the Stripe webhook resets `billed_at` for that customer/period so the cron can retry billing. |
