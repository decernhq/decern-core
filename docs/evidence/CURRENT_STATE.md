# Evidence Layer: Current State Assessment

> Produced during the exploration phase. Describes what exists today so the design can build on it rather than around it.

## 1. Gate run output: console only, no structured record

The gate CLI (`gate/src/main.ts:run()`) produces human-readable console log lines and an exit code (0 = pass, 1 = block). There is **no structured evidence record**, no JSON output, and no machine-readable artifact from the CLI side.

The only persistent record is created server-side.

## 2. Persistent data: `judge_gate_runs` table (judge only)

**File**: `supabase/migrations/00044_judge_gate_runs.sql`
**Writer**: `cloud/app/api/decision-gate/judge/route.ts` (lines 517-537)

The judge endpoint inserts a row into `judge_gate_runs` on every judge invocation:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | `gen_random_uuid()` |
| `workspace_id` | uuid FK | |
| `decision_id` | uuid FK (nullable) | SET NULL on decision delete |
| `decision_adr_ref` | text | Snapshot at run time |
| `decision_title` | text | Snapshot at run time |
| `pr_title` | text | From CI_PR_TITLE via gate CLI |
| `pr_url` | text | From CI_PR_URL via gate CLI |
| `base_sha` | text | |
| `head_sha` | text | |
| `allowed` | boolean NOT NULL | |
| `advisory` | boolean NOT NULL | |
| `confidence_percent` | smallint (0-100) | |
| `reason` | text | |
| `advisory_message` | text | |
| `created_at` | timestamptz | |

**Critical gaps relative to audit-grade evidence:**

- Inserted best-effort, fire-and-forget (`.then()`, line 535). Insert failures are logged to console only.
- **Validate-only gate runs (no judge) produce NO persistent record.** If a gate passes on validate alone (judge disabled), nothing is stored.
- No `evidence_id` (the `id` is a v4 UUID, not time-ordered v7).
- No decision content hash (ADR content at evaluation time).
- No diff hash or diff metadata (size, files touched).
- No author identity (CI token identifies workspace, not developer).
- No LLM model/provider/temperature/prompt hash/response hash/latency.
- No hash chain, no previous record reference.
- No cryptographic signature.
- No deterministic check results.
- No schema version.
- No CI provider identification.
- No repository identification.
- Records are **mutable** in the database (no hash integrity).
- RLS allows workspace members to read; service role writes. No audit of reads.

## 3. Workspace policies table

**File**: `supabase/migrations/00027_workspace_policies.sql` + `00029_rename_enforce_to_high_impact.sql`

| Column | Type | Default |
|--------|------|---------|
| `workspace_id` | uuid PK FK | |
| `require_linked_pr` | boolean | false |
| `require_approved` | boolean | true |
| `high_impact` | boolean | true |
| `judge_blocking` | boolean | true |
| `judge_tolerance_percent` | int (0-100) | NULL |

**Missing settings needed for evidence layer:**
- `judge_mode` (advisory vs deterministic_only)
- `evidence_retention_days`

## 4. Authentication and identity

### CI token (gate API auth)
- Gate CLI sends `Authorization: Bearer <token>`.
- Server hashes with SHA-256 and looks up `workspaces.ci_token_hash`.
- Token identifies a **workspace**, not a user/developer. No per-developer identity in gate runs.
- Token is generated once per workspace; there is no rotation mechanism or key versioning.

### User auth (dashboard)
- Supabase Auth (email/password, GitHub OAuth via cloud).
- Session-based (JWT in cookies), RLS-enforced.
- Dashboard reads of gate runs go through Supabase RLS (workspace membership check).

### Identity gap
The CI environment knows who triggered the PR (via CI env vars like `GITHUB_ACTOR`, `GITLAB_USER_LOGIN`, etc.), but the gate CLI **does not capture or forward any author identity** to the server. The server only knows the workspace.

## 5. LLM Judge invocation details

**File**: `cloud/app/api/decision-gate/judge/route.ts`

- Supports two providers: OpenAI-compatible (`/chat/completions`) and Anthropic native (`/v1/messages`).
- BYO LLM: config passed per-request in the body (`llm: {baseUrl, apiKey, model}`). Keys are used in-memory only, never stored.
- Fair-use fallback: server-side `OPEN_AI_API_KEY` + default model (`gpt-4o-mini`).
- System prompt is hardcoded in the route (lines 416-428).
- Response is parsed via `parseJudgeResponse()` + `computeJudgeOutcome()` from `@decern/protocol/policies`.
- Token usage recorded to `judge_usage` table for billing (`recordJudgeUsage()`).

**Not recorded anywhere:**
- LLM provider name, model version, temperature, top_p
- Prompt hash (SHA-256 of the exact prompt sent)
- Response hash (SHA-256 of the raw LLM response)
- Latency of the LLM call
- Whether BYO or fair-use was used

## 6. Override mechanism: none

There is **no override workflow**. When the gate returns exit code 1 (block), the options are:

1. Fix the code/decision to make the gate pass.
2. Remove or disable the gate from CI configuration.
3. At the Git provider level: admin dismisses or bypasses the required status check (GitHub: "Bypass branch protections"; GitLab: "Allow merge despite pipeline failure").

Option 3 is completely invisible to Decern. There is no record in Decern that a block was overridden, by whom, or why.

## 7. Access logging: none

No record is kept of who reads gate run data. Dashboard queries go through Supabase RLS, but the access itself is not logged. No `evidence_access_log` table or equivalent.

## 8. Export capabilities

- **Decisions**: CSV export exists (`cloud/app/api/decisions/export/csv`).
- **Gate runs**: No export. Dashboard shows recent runs via `lib/queries/gate-runs.ts`, but there's no API or CLI for bulk export.
- **No bundle format**, no verification tooling.

## 9. Retention

No retention policy. Data lives in PostgreSQL indefinitely. No scheduled cleanup, no cold storage integration, no archival.

## 10. Deterministic checks

The gate CLI has file-pattern-based policy checking (`gate/src/required-patterns.ts`): if changed files match high-impact patterns, a decision reference is required. This is the only deterministic check.

There is **no pluggable check system**. No path denylist per decision, no dependency denylist, no regex checks, no file-type denylist, no size threshold checks.

## 11. Validate-only flow: invisible

When the gate CLI calls `/api/decision-gate/validate` and the check passes without judge (`DECERN_GATE_JUDGE_ENABLED=false`, which is the default), the validate endpoint returns a JSON response and the CLI exits 0. **Nothing is persisted.** This is the most common flow (judge is opt-in), and it leaves zero audit trail.

## 12. Summary of gaps

| Capability | Current State | Gap |
|-----------|---------------|-----|
| Structured evidence record | None (console logs + basic DB row for judge only) | Complete gap |
| Evidence for validate-only runs | None | Complete gap |
| Cryptographic hash chain | None | Complete gap |
| Record signing | None | Complete gap |
| Author identity in records | Not captured | Complete gap |
| LLM invocation metadata | Not recorded | Complete gap |
| Deterministic check system | File patterns only, not pluggable | Mostly gap |
| Override workflow | None | Complete gap |
| Access logging | None | Complete gap |
| Export bundles | None | Complete gap |
| Verification tooling | None | Complete gap |
| Retention policy | None | Gap |
| Tip hash publishing | None | Complete gap |
| `judge_mode` setting | None | Gap |
| Schema versioning | None | Gap |

## 13. What we CAN build on

- **Supabase/PostgreSQL** is the persistence layer for all repos. Migrations are well-organized (44 sequential). Row-level security is consistently applied. We should add new tables via new migrations.
- **`judge_gate_runs`** is a starting point. Rather than replacing it, we can create a new `evidence_records` table and let `judge_gate_runs` continue to serve the dashboard (or migrate the dashboard to read from evidence records).
- **The gate CLI** (`gate/src/main.ts`) is the single integration point for all CI providers. Adding structured output (JSON evidence record) alongside the human-readable console output is straightforward.
- **`@decern/protocol`** is the right place for evidence record types, canonical JSON, and hash computation (pure functions, no side effects, framework-agnostic).
- **`cloud/app/api/`** is where the validate and judge endpoints live. Evidence record creation should happen here (server-side, after both validate and judge complete).
- **CI token auth** works. We can extend the gate CLI to forward CI metadata (author, CI provider, repo) that the server cannot otherwise know.
- **Vitest** is the test framework. Tests for new modules should use it.
