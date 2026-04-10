# Evidence Layer: Design Document

> This document describes how each of the seven evidence components will be implemented in the Decern codebase. It references specific files, tables, and data flows. Review and approve before implementation begins.

## Architecture overview

```
Gate CLI (gate/)                    Cloud API (cloud/)                   Database (Supabase)
─────────────────                   ──────────────────                   ───────────────────
1. Run gate checks                  4. Create evidence record            evidence_records (new)
2. Collect CI metadata              5. Compute hashes + sign             evidence_chain_tips (new)
3. POST to /api/decision-gate/*     6. Append to hash chain              evidence_access_log (new)
   with enriched payload            7. Return evidence_id to CLI         workspace_policies (extend)
                                    8. Persist (atomic with chain tip)

Protocol (protocol/)
────────────────────
- Evidence record TypeScript types
- Canonical JSON (RFC 8785)
- Hash computation (pure functions)
- Deterministic check interfaces
- Reason code enums
```

**Key design decision:** Evidence records are created **server-side** (in the cloud API), not client-side (in the gate CLI). Rationale:
- The server is the trust anchor; the CLI runs in untrusted CI environments.
- The server holds the signing key and the chain tip.
- The server has access to the decision content (for hashing) that the CLI doesn't fully have.
- The CLI receives the `evidence_id` in the response and can include it in its output.

## Component 1: Evidence record schema v1

### JSON Schema file
**Create**: `protocol/schemas/evidence/v1.json` (JSON Schema Draft 2020-12)

Placed in `protocol/` because both gate (for type imports) and cloud (for validation) depend on it.

### TypeScript types
**Create**: `protocol/src/evidence/record.ts`

```typescript
export interface EvidenceRecord {
  evidence_id: string;               // UUID v7
  schema_version: "decern_evidence_v1";
  timestamp_utc: string;             // RFC 3339 with microseconds
  timestamp_source: TimestampSource;
  workspace_id: string;
  repository_identifier: string;     // e.g. "github.com/acme/payments"
  pull_request_id: string;
  commit_sha: string;
  base_commit_sha: string;
  author_identity: AuthorIdentity;
  ci_provider: CiProvider;
  decision_id: string;
  decision_version: string;
  decision_content_hash: string;     // SHA-256
  diff_hash: string;                 // SHA-256
  diff_size_bytes: number;
  diff_files_touched: string[];
  judge_invocation: JudgeInvocation | null;
  deterministic_checks: DeterministicCheckResult[];
  verdict: Verdict;
  reason_code: ReasonCode;
  reason_detail: string;
  override?: Override;
  previous_evidence_hash: string | null;
  current_evidence_hash: string;
  signature: Signature;
}
```

Full type definitions for sub-objects (`AuthorIdentity`, `JudgeInvocation`, `Verdict`, `ReasonCode`, `Signature`, etc.) in the same file.

### Validation
**Create**: `protocol/src/evidence/validate.ts`

Uses the JSON Schema for runtime validation. We'll use `ajv` (already the standard in the JS ecosystem for JSON Schema 2020-12) as a dev dependency in protocol. The validator rejects unknown fields (strict mode) and missing required fields.

### Reason codes (initial enum)
```typescript
export type ReasonCode =
  | "PASS"
  | "PASS_OBSERVATION"
  | "OUT_OF_SCOPE"
  | "DEPRECATED_PATTERN"
  | "UNAPPROVED_DEPENDENCY"
  | "NO_DECISION_REFERENCED"
  | "DECISION_NOT_FOUND"
  | "DECISION_NOT_APPROVED"
  | "LINKED_PR_REQUIRED"
  | "DETERMINISTIC_RULE_VIOLATION"
  | "JUDGE_BLOCKED"
  | "JUDGE_LOW_CONFIDENCE"
  | "JUDGE_UNAVAILABLE"
  | "OVERRIDE"
  | "POLICY_VIOLATION";
```

### Files created/modified
- **Create**: `protocol/schemas/evidence/v1.json`
- **Create**: `protocol/src/evidence/record.ts` (types + enums)
- **Create**: `protocol/src/evidence/validate.ts` (schema validator)
- **Create**: `protocol/src/evidence/validate.test.ts`
- **Create**: `protocol/src/evidence/index.ts` (re-exports)
- **Modify**: `protocol/src/index.ts` (add `./evidence` export)
- **Modify**: `protocol/package.json` (add `./evidence` export path, add `ajv` devDep)

---

## Component 2: Canonical JSON + hash chain

### Canonical JSON
**Create**: `protocol/src/evidence/canonical.ts`

Implement RFC 8785 JSON Canonicalization Scheme. The minimal subset we need:
- Sorted keys (lexicographic)
- No whitespace
- UTF-8 encoding
- Number serialization per RFC 8785 (no trailing zeros, no positive sign)

We'll use the `canonicalize` npm package (implements RFC 8785, ~2KB, well-maintained) if available, or implement the subset. The code will cite RFC 8785 in comments.

### Hash computation
**Create**: `protocol/src/evidence/hash.ts`

```typescript
export function computeEvidenceHash(
  recordWithoutHashAndSignature: Omit<EvidenceRecord, 'current_evidence_hash' | 'signature'>,
  previousHash: string | null
): string
// Returns: SHA256(canonical_json(record) || previousHash ?? "")
```

Uses Node.js `crypto.createHash('sha256')`. Pure function, testable.

### Hash chain (server-side)
**Create**: `cloud/lib/evidence/chain.ts`

```typescript
export async function appendToChain(
  supabase: SupabaseClient,
  record: Omit<EvidenceRecord, 'previous_evidence_hash' | 'current_evidence_hash' | 'signature'>
): Promise<EvidenceRecord>
```

**Database table**: `evidence_chain_tips`

| Column | Type | Notes |
|--------|------|-------|
| `workspace_id` | uuid PK FK | One tip per workspace |
| `tip_evidence_id` | uuid | Latest evidence record ID |
| `tip_hash` | text | Latest evidence hash |
| `updated_at` | timestamptz | |

**Concurrency**: Use Postgres `SELECT ... FOR UPDATE` on `evidence_chain_tips` row for the workspace. This is a row-level lock held only during the append (read tip + insert record + update tip), not during the gate run itself. If the row doesn't exist (first record), `INSERT ... ON CONFLICT DO NOTHING` then re-select with lock.

**Atomicity**: The insert into `evidence_records` and the update of `evidence_chain_tips` happen in a single Supabase RPC call (Postgres function) to guarantee atomicity. If either fails, neither persists.

**First record**: `previous_evidence_hash = null`. The hash is `SHA256(canonical_json(record) || "")`.

### Chain verification
**Create**: `protocol/src/evidence/verify-chain.ts`

```typescript
export function verifyChain(records: EvidenceRecord[]): VerifyChainResult
// Returns: { valid: true } | { valid: false, brokenAt: string, expected: string, actual: string }
```

Pure function. Takes an array of records in chain order, recomputes each hash, returns the exact `evidence_id` where a break occurs.

### Files created/modified
- **Create**: `protocol/src/evidence/canonical.ts`
- **Create**: `protocol/src/evidence/canonical.test.ts`
- **Create**: `protocol/src/evidence/hash.ts`
- **Create**: `protocol/src/evidence/hash.test.ts`
- **Create**: `protocol/src/evidence/verify-chain.ts`
- **Create**: `protocol/src/evidence/verify-chain.test.ts`
- **Create**: `cloud/lib/evidence/chain.ts`
- **Create**: `cloud/lib/evidence/chain.test.ts`
- **Create**: new migration `00045_evidence_records.sql` (table + chain tips + RPC)

### Migration: `00045_evidence_records.sql`

```sql
-- evidence_records: audit-grade gate run evidence
CREATE TABLE public.evidence_records (
  evidence_id uuid PRIMARY KEY,
  schema_version text NOT NULL DEFAULT 'decern_evidence_v1',
  timestamp_utc timestamptz NOT NULL,
  timestamp_source text NOT NULL DEFAULT 'system_ntp',
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  repository_identifier text NOT NULL,
  pull_request_id text NOT NULL,
  commit_sha text NOT NULL,
  base_commit_sha text NOT NULL,
  author_identity jsonb NOT NULL,
  ci_provider text NOT NULL,
  decision_id text NOT NULL,
  decision_version text NOT NULL,
  decision_content_hash text NOT NULL,
  diff_hash text NOT NULL,
  diff_size_bytes integer NOT NULL,
  diff_files_touched text[] NOT NULL,
  judge_invocation jsonb,
  deterministic_checks jsonb NOT NULL DEFAULT '[]',
  verdict text NOT NULL,
  reason_code text NOT NULL,
  reason_detail text NOT NULL,
  override_data jsonb,
  previous_evidence_hash text,
  current_evidence_hash text NOT NULL,
  signature jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX evidence_records_workspace_ts ON public.evidence_records(workspace_id, timestamp_utc DESC);
CREATE INDEX evidence_records_chain ON public.evidence_records(workspace_id, current_evidence_hash);

-- Chain tip tracking
CREATE TABLE public.evidence_chain_tips (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tip_evidence_id uuid NOT NULL REFERENCES public.evidence_records(evidence_id),
  tip_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Atomic append RPC (service role only)
-- Inserts record + updates chain tip in a single transaction
CREATE OR REPLACE FUNCTION public.append_evidence_record(
  p_record jsonb,
  p_workspace_id uuid,
  p_evidence_id uuid,
  p_evidence_hash text
) RETURNS void AS $$
BEGIN
  INSERT INTO public.evidence_records SELECT * FROM jsonb_populate_record(null::public.evidence_records, p_record);
  INSERT INTO public.evidence_chain_tips (workspace_id, tip_evidence_id, tip_hash, updated_at)
  VALUES (p_workspace_id, p_evidence_id, p_evidence_hash, now())
  ON CONFLICT (workspace_id) DO UPDATE
  SET tip_evidence_id = EXCLUDED.tip_evidence_id,
      tip_hash = EXCLUDED.tip_hash,
      updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view evidence"
  ON public.evidence_records FOR SELECT
  USING (public.can_view_workspace_members(workspace_id, auth.uid()));
```

Note: The exact RPC signature may need adjustment during implementation. The `jsonb_populate_record` approach is one option; direct parameterized insert is another. Will finalize during implementation.

### Backward compatibility

The existing `judge_gate_runs` table is left as-is. The dashboard currently reads from it. Over time, the dashboard can migrate to read from `evidence_records`, but for v1 we write to BOTH tables when a judge run occurs. This avoids breaking existing dashboard queries.

---

## Component 3: Signing

### Signer interface
**Create**: `protocol/src/evidence/signer.ts`

```typescript
export interface Signer {
  sign(payload: Uint8Array): Promise<Uint8Array>;
  getPublicKey(): Promise<Uint8Array>;
  getKeyId(): Promise<string>; // base64url(SHA256(publicKey))
  getAlgorithm(): string;      // "Ed25519"
}
```

### LocalSigner
**Create**: `cloud/lib/evidence/local-signer.ts`

Uses `tweetnacl` (or Node.js `crypto.sign` with Ed25519 — available since Node 18). Reads the private key from:
1. Env var `DECERN_EVIDENCE_SIGNING_KEY` (base64-encoded Ed25519 private key)
2. File path `DECERN_EVIDENCE_SIGNING_KEY_PATH`

On first startup (or via a setup CLI command), generates a keypair if none exists.

`key_id` = `base64url(SHA256(publicKey))`.

### ExternalKMSSigner (stub)
**Create**: `cloud/lib/evidence/external-kms-signer.ts`

```typescript
export class ExternalKMSSigner implements Signer {
  // Stub: throws "Not implemented. See docs/evidence/SIGNING.md for integration guide."
  // Interface designed for: AWS KMS, GCP KMS, HashiCorp Vault, PKCS#11 HSM
}
```

### Verification utility
**Create**: `gate/src/verify-evidence.ts`

New CLI subcommand: `decern-gate verify-evidence <bundle-path>`

- Reads the export bundle ZIP
- Recomputes all hashes in chain order
- Verifies each signature against bundled public keys
- Exits 0 if valid, 1 with precise error message

### Key rotation
The `key_id` in each record identifies which key signed it. Old records remain verifiable as long as the public key is available (bundled in exports). Key rotation = generate new keypair, start signing with it; old records still verify with old key.

### Files created/modified
- **Create**: `protocol/src/evidence/signer.ts` (interface)
- **Create**: `cloud/lib/evidence/local-signer.ts`
- **Create**: `cloud/lib/evidence/local-signer.test.ts`
- **Create**: `cloud/lib/evidence/external-kms-signer.ts`
- **Create**: `gate/src/verify-evidence.ts`
- **Create**: `gate/src/verify-evidence.test.ts`
- **Modify**: `gate/src/bin.ts` (add `verify-evidence` subcommand)
- **Create**: `docs/evidence/SIGNING.md`

---

## Component 4: Access logging

### Database table
**Migration**: add to `00045_evidence_records.sql` (or separate `00046_evidence_access_log.sql`)

```sql
CREATE TABLE public.evidence_access_log (
  access_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp_utc timestamptz NOT NULL DEFAULT timezone('utc', now()),
  actor_identity jsonb NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  evidence_ids_accessed text[],
  query_descriptor text,
  access_method text NOT NULL, -- 'api' | 'ui' | 'export' | 'cli'
  source_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX evidence_access_log_workspace_ts ON public.evidence_access_log(workspace_id, timestamp_utc DESC);
ALTER TABLE public.evidence_access_log ENABLE ROW LEVEL SECURITY;
-- Only workspace admins can read access logs
CREATE POLICY "Workspace admins can view access log"
  ON public.evidence_access_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = evidence_access_log.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.workspace_role = 'admin'
  ));
```

### Implementation
**Create**: `cloud/lib/evidence/access-log.ts`

```typescript
export async function logEvidenceAccess(params: {
  supabase: SupabaseClient;
  actorIdentity: { provider: string; id: string; email: string };
  workspaceId: string;
  evidenceIds?: string[];
  queryDescriptor?: string;
  accessMethod: 'api' | 'ui' | 'export' | 'cli';
  sourceIp: string | null;
  userAgent: string | null;
}): Promise<void>
```

Called from:
- Evidence API endpoints (when records are fetched)
- Dashboard gate-runs page (when user views evidence)
- Export bundle generation
- CLI verify command (if it fetches from API)

**Design choice**: The access log is NOT part of the hash chain (documented in CURRENT_STATE.md rationale). It's append-only and immutable (no UPDATE/DELETE policies), but not hash-chained. Rationale: chain-of-chains adds complexity with minimal audit value for access logs. The access log is exportable and timestamped, which satisfies SOC 2 CC6.1 requirements.

### Files created/modified
- **Create**: `cloud/lib/evidence/access-log.ts`
- **Create**: `cloud/lib/evidence/access-log.test.ts`
- **Modify**: evidence API endpoints to call `logEvidenceAccess()`
- **Modify**: dashboard gate-runs queries to call `logEvidenceAccess()`

---

## Component 5: Override workflow

### API endpoint
**Create**: `cloud/app/api/decision-gate/override/route.ts`

```
POST /api/decision-gate/override
Authorization: Bearer <CI_TOKEN> OR Supabase session
Body: {
  evidence_id: string,       // The blocked record to override
  override_reason: string,   // min 20 chars, max 1000
}
```

### Flow
1. Authenticate caller (CI token or user session).
2. Load the referenced evidence record; verify `verdict = "block"`.
3. Verify the record belongs to the caller's workspace.
4. Create a NEW evidence record with `reason_code = "OVERRIDE"` and the `override` object populated.
5. Append to the hash chain (same chain).
6. Return the override `evidence_id`.
7. (For GitHub Actions) Update the commit status to `success` using the GitHub API.
8. (For GitLab CI) Create an external status update.

### CI provider integration for status update

**GitHub Actions**: The gate CLI can set `GITHUB_TOKEN` to update the commit status. The override endpoint returns an `override_evidence_id`; a follow-up call (or the endpoint itself, if GitHub token is available server-side via `github_connections`) can call `POST /repos/{owner}/{repo}/statuses/{sha}` with `state: "success"`.

**GitLab CI**: The endpoint can call `POST /projects/{id}/statuses/{sha}` with `state: "success"` via GitLab API token.

**v1 scope**: Implement GitHub Actions status update. GitLab CI documented but stubbed.

### Known gap: Git provider bypass
Users can bypass Decern by dismissing required status checks at the Git provider level. This is outside Decern's control. Mitigation:
- Document that customers should configure branch protection rules to require the Decern check.
- The absence of an override record in the evidence chain, combined with a merged PR, is itself evidence of an out-of-band bypass (detectable during audit).
- Document this in `docs/evidence/DESIGN.md` as a known limitation.

### Files created/modified
- **Create**: `cloud/app/api/decision-gate/override/route.ts`
- **Create**: `cloud/lib/evidence/override.ts` (override logic)
- **Create**: `cloud/lib/evidence/override.test.ts`

---

## Component 6: Retention, export bundles, compliance mapping

### Retention

**Workspace setting**: Add `evidence_retention_days` to `workspace_policies` (default 730 = 2 years). New migration column.

**Scheduled job**: A cron endpoint (`/api/cron/archive-evidence`) that:
1. Finds evidence records older than `retention_days` for each workspace.
2. Moves record payloads to cold storage (for SaaS: serialized to S3/equivalent; for v1: mark as `archived` in the DB with payload columns NULLed but header + hash + signature preserved).
3. The chain tip manifest still references archived records by hash — the chain remains verifiable even after archival.

**Hard-delete is not supported in v1.** For GDPR data subject access/erasure: the "access redaction" pattern — zero out personally identifiable payload fields but keep `evidence_id`, `current_evidence_hash`, `previous_evidence_hash`, and `signature`. The chain integrity is preserved. Document this in DESIGN.md.

### Export bundles

**CLI command**: `decern-gate export-bundle --workspace <id> --from <date> --to <date> --token <ci-token>`

Calls a new API endpoint: `GET /api/evidence/export?workspace=<id>&from=<date>&to=<date>`

**Bundle format** (ZIP):
```
bundle.zip/
  manifest.json         # Metadata: workspace, date range, record count, tool version, timestamp
  records.jsonl         # One evidence record per line, chain order
  access_log.jsonl      # Access log entries for the period
  public_keys/          # All public keys referenced in records
    <key_id>.pub        # Ed25519 public key, base64-encoded
  tip_hashes.json       # Published tip hashes for the period
  README.md             # Human-readable verification instructions
  VERIFICATION.md       # Technical verification steps with exact commands
```

### Tip hash publishing

**Scheduled job**: A cron endpoint (`/api/cron/publish-tip-hashes`) that runs hourly:
1. For each active workspace, reads the current chain tip hash.
2. Signs it with the server key.
3. Writes to a predictable path (for SaaS: Supabase Storage or S3; for self-hosted: configurable target).
4. Path format: `tip-hashes/<workspace_id>/<yyyy>/<mm>/<dd>/<hh>.json`

Content:
```json
{
  "workspace_id": "...",
  "timestamp_utc": "...",
  "tip_evidence_id": "...",
  "tip_hash": "...",
  "signature": { "algorithm": "Ed25519", "key_id": "...", "value": "..." }
}
```

This makes retroactive tampering detectable: an auditor can compare the tip hash at time T (from the public log) against the chain they received in the export bundle.

### Compliance mapping documents

**Create**: `docs/compliance/EU_AI_ACT_ART_14.md`
**Create**: `docs/compliance/ISO_IEC_42001.md`
**Create**: `docs/compliance/SOC2_CHANGE_MANAGEMENT.md`

Each document maps specific regulatory requirements to Decern capabilities field by field, using only "provides evidence for" / "supports compliance with" language. Where gaps exist, they are documented explicitly.

### Files created/modified
- **Modify**: migration to add `evidence_retention_days` column to `workspace_policies`
- **Create**: `cloud/app/api/cron/archive-evidence/route.ts`
- **Create**: `cloud/app/api/evidence/export/route.ts`
- **Create**: `cloud/app/api/cron/publish-tip-hashes/route.ts`
- **Create**: `gate/src/export-bundle.ts`
- **Modify**: `gate/src/bin.ts` (add `export-bundle` subcommand)
- **Create**: `docs/compliance/EU_AI_ACT_ART_14.md`
- **Create**: `docs/compliance/ISO_IEC_42001.md`
- **Create**: `docs/compliance/SOC2_CHANGE_MANAGEMENT.md`

---

## Component 7: Deterministic-only mode

### Workspace setting
Add `judge_mode` to `workspace_policies`: `"advisory"` (default) or `"deterministic_only"`.

### Deterministic check types
**Create**: `protocol/src/evidence/checks/` directory

Common interface:
```typescript
export interface DeterministicCheck {
  id: string;          // e.g. "path_denylist"
  type: CheckType;
  check(diff: DiffInput, decision: DecisionInput): CheckResult;
}

export type CheckType =
  | "path_denylist"
  | "dependency_denylist"
  | "regex_required"
  | "regex_forbidden"
  | "file_type_denylist"
  | "size_threshold";

export interface CheckResult {
  check_id: string;
  check_type: CheckType;
  result: "pass" | "fail";
  details: string;
  details_hash: string; // SHA-256 of canonical details
}
```

Implementations:
- **Create**: `protocol/src/evidence/checks/path-denylist.ts`
- **Create**: `protocol/src/evidence/checks/dependency-denylist.ts`
- **Create**: `protocol/src/evidence/checks/regex-checks.ts` (required + forbidden)
- **Create**: `protocol/src/evidence/checks/file-type-denylist.ts`
- **Create**: `protocol/src/evidence/checks/size-threshold.ts`
- **Create**: `protocol/src/evidence/checks/index.ts`
- **Create**: `protocol/src/evidence/checks/*.test.ts`

### Decision-level check configuration
Each decision record can have a `checks` JSON field specifying which deterministic checks apply and their parameters. This requires a migration to add a `checks` JSONB column to the `decisions` table.

### Verdict computation
**Create**: `protocol/src/evidence/verdict.ts`

```typescript
export function computeVerdict(params: {
  judgeOutcome: JudgeOutcome | null;
  deterministicResults: CheckResult[];
  judgeMode: "advisory" | "deterministic_only";
  advisory: boolean; // Free plan or judge_blocking=false
}): { verdict: Verdict; reasonCode: ReasonCode; reasonDetail: string }
```

In `deterministic_only` mode:
- Verdict is computed solely from `deterministicResults`.
- If all deterministic checks pass, verdict = `"pass"` even if the LLM said "block".
- The LLM result is still recorded in `judge_invocation` for transparency.

In `advisory` mode (default):
- Both LLM and deterministic checks contribute to the verdict.
- A deterministic check failure always blocks (overrides LLM "pass").
- An LLM "block" blocks unless the workspace is in advisory/observation mode.

### Files created/modified
- **Modify**: migration to add `judge_mode` to `workspace_policies`
- **Modify**: migration to add `checks` JSONB to `decisions`
- **Create**: `protocol/src/evidence/checks/` (all check implementations + tests)
- **Create**: `protocol/src/evidence/verdict.ts`
- **Create**: `protocol/src/evidence/verdict.test.ts`
- **Modify**: `cloud/app/api/decision-gate/judge/route.ts` (run deterministic checks, respect judge_mode)
- **Create**: `docs/evidence/JUDGE_MODES.md`

---

## Gate CLI changes

### Enriched payload
**Modify**: `gate/src/main.ts`

The gate CLI will collect and forward additional CI metadata in the request body:

```typescript
{
  // Existing fields
  diff, truncated, baseSha, headSha, adrRef, decisionId, prTitle, prUrl, llm,

  // New fields for evidence
  ci_metadata: {
    ci_provider: "github_actions" | "gitlab_ci" | "bitbucket_pipelines" | "jenkins" | "azure_devops" | "unknown",
    repository_identifier: string,  // e.g. "github.com/acme/payments"
    author_identity: {
      provider: string,
      id: string,
      email: string,
      display_name: string,
    },
    commit_sha: string,
    diff_files: string[],
    diff_size_bytes: number,
  }
}
```

CI provider detection: read well-known env vars (`GITHUB_ACTIONS`, `GITLAB_CI`, `BITBUCKET_BUILD_NUMBER`, `JENKINS_URL`, `BUILD_BUILDID` for Azure DevOps).

Author identity: read from CI env vars (`GITHUB_ACTOR`, `GITHUB_ACTOR_ID`, `GITLAB_USER_LOGIN`, `GITLAB_USER_EMAIL`, etc.).

### New CLI subcommands
- `verify-evidence <bundle-path>` — Verify an export bundle
- `export-bundle --workspace <id> --from <date> --to <date> --token <ci-token>` — Export evidence bundle

These are detected by checking `process.argv[2]` before calling `run()`.

---

## Data flow (complete gate run with evidence)

```
1. Gate CLI starts
2. Compute changed files, check policy
3. Extract decision IDs
4. Collect CI metadata (provider, author, repo, commit SHAs)
5. Compute diff hash (SHA-256) and diff size
6. POST /api/decision-gate/validate with ci_metadata
   → Server validates, returns { valid, status, ... , evidence_id? }
   → If validate-only (no judge): server creates evidence record RIGHT HERE
7. If judge enabled: POST /api/decision-gate/judge with ci_metadata + diff
   → Server runs LLM judge
   → Server runs deterministic checks (if any configured on the decision)
   → Server computes verdict (respecting judge_mode)
   → Server creates evidence record with all fields
   → Server appends to hash chain (atomic)
   → Server returns { allowed, reason, confidence, evidence_id }
8. Gate CLI logs result + evidence_id
9. Gate CLI exits with appropriate code
```

**Key change**: The validate endpoint also creates evidence records now (for validate-only runs that currently leave no trace).

---

## Migration strategy for existing data

The existing `judge_gate_runs` rows cannot be retroactively added to a hash chain (they weren't hashed or signed at creation time). Strategy:

1. Keep `judge_gate_runs` table as-is for backward compatibility.
2. New evidence records go into `evidence_records` table.
3. When a judge run creates an evidence record, we ALSO continue writing to `judge_gate_runs` for the dashboard (until the dashboard is migrated).
4. Document that evidence chain integrity starts from the first `decern_evidence_v1` record. Pre-existing `judge_gate_runs` data is "best-effort historical context, not cryptographically verified."
5. Eventually (follow-up), migrate the dashboard to read from `evidence_records`.

---

## Failure modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Chain tip lock timeout | Gate run delayed | Lock timeout of 5s; if exceeded, create evidence record WITHOUT chain (mark as `unchained`, log warning). Chain can be repaired later. |
| Signing key unavailable | Cannot sign records | Fail open with `signature: null` and `schema_version: "decern_evidence_v1_unsigned"`. Log critical warning. Record is still hash-chained. |
| Evidence DB insert fails | No evidence record | Gate run still completes (evidence is best-effort, not blocking). Log error. This matches current behavior where `judge_gate_runs` insert is fire-and-forget. |
| Hash chain breaks (corruption) | Audit gap | `verify_chain` detects and reports exact break point. Records after the break are individually valid (signed) but chain continuity is lost from that point. Document repair procedure in FOLLOW_UPS.md. |
| Concurrent appends to same workspace | Race condition | Postgres `SELECT FOR UPDATE` ensures serialized appends. Second concurrent append waits (max 5s timeout). |

---

## What is NOT in scope for v1

- Actual AWS KMS / GCP KMS / Vault / HSM integration (stub interface only)
- RFC 3161 timestamping (field exists, only `system_ntp` valid)
- S3 Glacier cold storage integration (v1 uses DB-level archival flag)
- Webhook notifications for evidence events
- Real-time chain monitoring/alerting
- Dashboard UI for evidence records (follow-up)
- Migration of existing `judge_gate_runs` data into evidence chain

These are documented in `docs/evidence/FOLLOW_UPS.md`.

---

## Commit plan (7 logical commits)

1. **Component 1**: Evidence record schema, types, validation, reason codes
2. **Component 2**: Canonical JSON, hash computation, hash chain, chain verification, DB migration
3. **Component 3**: Signer interface, LocalSigner, ExternalKMSSigner stub, verify-evidence CLI
4. **Component 4**: Access logging table, module, integration
5. **Component 5**: Override workflow, GitHub Actions status update
6. **Component 6**: Retention, export bundles, tip hash publishing, compliance docs
7. **Component 7**: Deterministic checks, judge_mode, verdict computation
