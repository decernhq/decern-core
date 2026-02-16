# Decision Gate API (MVP)

CI/CD validation endpoint: it checks whether a decision exists and is in **approved** status. Behaviour depends on plan and optional query params.

## Plan and behaviour (validate)

- **Free plan:** observation only — response is always `200` with `valid`, `decisionId`, `adrRef`. Neither `hasLinkedPR` nor `status` are included; the CI must not fail the pipeline.
- **Team plan:** observation by default. Enforcement (422 if decision not approved) only when the client sends `highImpact=true` (e.g. for rule-based High Impact changes). Without `highImpact=true`, response is always `200` (observation).
- **Business / Enterprise / Governance:** enforcement by default — if the decision is not approved the response is `422`; when approved the body includes `status: "approved"`. Enforcement can be disabled per request with `enforce=false` (response then always `200`, observation style).

## Endpoint

- **Method:** `GET`
- **URL:** `/api/decision-gate/validate`
- **Query params:**
  - `decisionId` (decision UUID) or `adrRef` (e.g. `ADR-001`) — at least one required. With `adrRef` the decision is looked up by workspace + ADR reference.
  - **Optional:** `highImpact` — set to `true` or `1` so that on **Team** plan the gate uses enforcement (422 if not approved). Ignored on other plans.
  - **Optional:** `enforce` — set to `false` or `0` to disable enforcement on **Business** (and Enterprise/Governance): response is always `200` (observation). Default when omitted is `true` (enforcement on).

## Authentication

- **Header:** `Authorization: Bearer <token>`
- The token is **per workspace**: it is created from **Dashboard → Workspace** (section "CI Token (Decision Gate)"). Only the workspace owner can create or revoke the token. The plain token is shown only once at creation; only its hash is stored in the DB.
- If missing or invalid for every workspace → `401` with `{ "valid": false, "reason": "unauthorized" }`.

## Responses

| Status | Body | Meaning |
|--------|------|---------|
| 200 | `{ "valid": true, "decisionId": "<uuid>", "adrRef": "<adr_ref>", "hasLinkedPR": bool, "status": "approved" }` | Decision found and approved (enforcement mode). |
| 200 | `{ "valid": true, "decisionId": "<uuid>", "adrRef": "<adr_ref>" }` | Observation mode (Free, or Team without highImpact, or Business with enforce=false); no `hasLinkedPR` or `status`, CI must not fail. |
| 401 | `{ "valid": false, "reason": "unauthorized" }` | Token missing or invalid. |
| 404 | `{ "valid": false, "reason": "not_found" }` | No decision with that id. |
| 422 | `{ "valid": false, "reason": "invalid_input" }` | `decisionId` empty, too long (>128) or invalid characters. |
| 422 | `{ "valid": false, "reason": "not_approved", "status": "<status>" }` | Decision found but not approved (enforcement mode: Team with highImpact=true, or Business+ with enforce not false). |
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

After validation (validate), the **decern-gate** CLI can call the **judge** endpoint to have an LLM evaluate whether the submitted **diff** is consistent with the referenced decision (ADR or decision ID). The **LLM is chosen and configured by the user**: decern-gate sends in the request body the parameters needed to call the LLM. **Decern does not store or retain API keys**: they are used only for the single request.

- **Anthropic:** if `llm.baseUrl` is `https://api.anthropic.com` (with or without path, e.g. `https://api.anthropic.com/v1`), the backend uses the **native** Messages API (`POST /v1/messages`), with no gateway.
- **Other providers:** for any other URL (OpenAI, Together, OpenRouter, etc.) the backend uses the **OpenAI-compatible fallback** (`POST {baseUrl}/chat/completions`).

- **Method:** `POST`
- **URL:** `/api/decision-gate/judge` (path configurable client-side via `DECERN_JUDGE_PATH`).
- **Authentication:** same as validate — header `Authorization: Bearer <DECERN_CI_TOKEN>`.
- **Plans:** Judge is available on **all plans** (Free, Team, Business, Enterprise, Governance). On **Free** and **Team** the Judge is **advisory** (BYO LLM): the client may show the result but must not fail the pipeline on `allowed: false`. On **Business** (and Enterprise/Governance) the Judge can **block** the CI when `allowed: false`. On Free, no billing is required; on Team and above, a payment method must be configured.

## Request body (JSON)

The client sends **exactly one** of `adrRef` or `decisionId` (not both) and **must** send the `llm` object with the user’s chosen LLM configuration (native Anthropic or OpenAI-compatible).

| Field        | Type    | Description |
|-------------|---------|-------------|
| `diff`      | string  | Full unified diff (`git diff base...head`), already filtered client-side (excluding binaries/images and files with patch >1MB); maximum size 2 MB. |
| `truncated` | boolean | `true` if the client truncated the diff to 2 MB (the judge may work on a partial diff). |
| `baseSha`   | string  | Git base ref (e.g. `origin/main` or SHA). |
| `headSha`   | string  | Git head ref (e.g. `HEAD` or SHA). |
| `adrRef`    | string  | Present **only** when the decision is an ADR (e.g. `ADR-002`). |
| `decisionId`| string  | Present **only** when the decision is a UUID (not ADR). |
| `llm`       | object  | **Required.** User’s LLM configuration (never stored). See below. |

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

| Field    | Type    | Description |
|----------|---------|-------------|
| `allowed`| boolean | `true` = the change is consistent with the decision, the gate can pass; `false` = block the CI. |
| `reason` | string (optional) | Short explanation (for logs or CI output). |

Examples:

- Pass: `{"allowed": true, "reason": "Change aligns with ADR-002."}`
- Block: `{"allowed": false, "reason": "Diff introduces a new DB column not mentioned in the decision."}`

On error (invalid token, decision not found, LLM timeout, network error to the LLM): response **200** with `{"allowed": false, "reason": "<appropriate message>"}` (fail-closed). In all cases decern-gate treats the gate as blocked when `allowed` is `false`.

## Environment variables (backend)

- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: same as validate (reading decisions and token lookup). No LLM keys are required on the backend: the user supplies their LLM configuration in the request body.

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
| **Billing required** | On **Team** and above, the workspace owner must have `stripe_customer_id` (payment configured). On **Free**, Judge is available without billing (BYO LLM, advisory). |
| **Plans** | Judge is available on Free (advisory), Team (advisory), and Business/Enterprise/Governance (can block). Unsupported plan: `allowed: false`, `reason: "Judge is not available for this plan."`. |
| **Idempotent billing** | The billing cron sets `billed_at` only for workspaces whose owners were successfully billed. A second run for the same period does not create duplicate invoices. |
| **Failed payment** | On `invoice.payment_failed` for a Judge invoice (description “Judge usage YYYY-MM”), the Stripe webhook resets `billed_at` for that customer/period so the cron can retry billing. |
