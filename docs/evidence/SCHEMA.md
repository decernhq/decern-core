# Evidence Record Schema v1 — Field Reference

> Schema version: `decern_evidence_v1`
> JSON Schema: `protocol/schemas/evidence/v1.json`
> TypeScript types: `protocol/src/evidence/record.ts`

## Top-level fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `evidence_id` | string (UUID v7) | Yes | Time-ordered unique ID for this record. |
| `schema_version` | `"decern_evidence_v1"` | Yes | Fixed literal. Enables forward-compatible parsing. |
| `timestamp_utc` | string (RFC 3339) | Yes | When the record was created, with microsecond precision. |
| `timestamp_source` | enum | Yes | How the timestamp was obtained. v1: `"system_ntp"` only. `"rfc3161_tsa"` reserved for future RFC 3161 timestamping. |
| `workspace_id` | string | Yes | Decern workspace that owns this gate run. |
| `repository_identifier` | string | Yes | Canonical repo identifier, e.g. `"github.com/acme/payments"`. |
| `pull_request_id` | string | Yes | PR/MR identifier within the repository. |
| `commit_sha` | string | Yes | Head commit SHA being evaluated. |
| `base_commit_sha` | string | Yes | Base commit SHA for the diff. |
| `author_identity` | object | Yes | Identity of the PR/commit author. See sub-object below. |
| `ci_provider` | enum | Yes | One of: `github_actions`, `gitlab_ci`, `bitbucket_pipelines`, `jenkins`, `azure_devops`, `unknown`. |
| `decision_id` | string | Yes | ID of the architecture decision evaluated against. |
| `decision_version` | string | Yes | Version of the decision at evaluation time. |
| `decision_content_hash` | string | Yes | SHA-256 of the canonical decision content at evaluation time. Proves which version of the rule was applied. |
| `diff_hash` | string | Yes | SHA-256 of the canonical diff analyzed. |
| `diff_size_bytes` | integer | Yes | Size of the diff in bytes. |
| `diff_files_touched` | string[] | Yes | File paths changed in the diff. |
| `judge_invocation` | object or null | Yes | LLM Judge details. Null if judge was not invoked (validate-only or deterministic-only mode). |
| `deterministic_checks` | array | Yes | Results of deterministic checks. Empty array if none configured. |
| `verdict` | enum | Yes | `"pass"`, `"warn"`, or `"block"`. |
| `reason_code` | enum | Yes | Structured code. See reason codes below. |
| `reason_detail` | string (max 2000) | Yes | Human-readable explanation. |
| `override` | object | No | Present only when this record is an override of a previous block. |
| `previous_evidence_hash` | string or null | Yes | SHA-256 of the previous record in the workspace chain. Null for the first record. |
| `current_evidence_hash` | string | Yes | SHA-256 of the canonical JSON of all fields except `signature` and `current_evidence_hash` itself, concatenated with `previous_evidence_hash`. |
| `signature` | object | Yes | Cryptographic signature over `current_evidence_hash`. |

## Sub-objects

### `author_identity`

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | Identity provider (e.g. `"github"`, `"gitlab"`). |
| `id` | string | Provider-specific user ID. |
| `email` | string | Author email as reported by CI. |
| `display_name` | string | Human-readable name. |

### `judge_invocation`

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | LLM provider (e.g. `"openai"`, `"anthropic"`). |
| `model` | string | Model name (e.g. `"gpt-4o-mini"`). |
| `model_version` | string | Model version or snapshot ID. |
| `temperature` | number or null | Temperature setting, if known. |
| `top_p` | number or null | Top-p setting, if known. |
| `prompt_hash` | string | SHA-256 of the exact prompt sent to the LLM. |
| `response_hash` | string | SHA-256 of the raw LLM response. |
| `latency_ms` | number | Wall-clock latency of the LLM call in milliseconds. |
| `token_usage` | object | `{ input_tokens, output_tokens }` as reported by the provider. |

### `deterministic_checks[]`

| Field | Type | Description |
|-------|------|-------------|
| `check_id` | string | Unique ID for this check instance. |
| `check_type` | enum | One of: `path_denylist`, `dependency_denylist`, `regex_required`, `regex_forbidden`, `file_type_denylist`, `size_threshold`. |
| `result` | `"pass"` or `"fail"` | |
| `details_hash` | string | SHA-256 of the canonical check details (for auditability without storing potentially large detail payloads). |

### `override`

| Field | Type | Description |
|-------|------|-------------|
| `override_id` | string | UUID of the override action. |
| `overridden_by` | AuthorIdentity | Who authorized the override. |
| `override_reason` | string (20-1000 chars) | Mandatory justification. |
| `override_timestamp` | string (RFC 3339) | When the override was issued. |
| `override_auth_method` | string | How the overrider authenticated (e.g. `"supabase_session"`, `"ci_token"`). |

### `signature`

| Field | Type | Description |
|-------|------|-------------|
| `algorithm` | string | `"Ed25519"` for v1. |
| `key_id` | string | `base64url(SHA-256(publicKey))` — identifies the signing key without requiring a central registry. |
| `value` | string | Base64-encoded signature bytes. |

## Reason codes

| Code | Verdict | Description |
|------|---------|-------------|
| `PASS` | pass | Change aligns with the referenced decision. |
| `PASS_OBSERVATION` | pass | Observation mode — would have blocked in enforcement mode. |
| `OUT_OF_SCOPE` | block | Change falls outside the scope of the referenced decision. |
| `DEPRECATED_PATTERN` | block | Change introduces a pattern the decision explicitly deprecates. |
| `UNAPPROVED_DEPENDENCY` | block | Change introduces a dependency not approved in the decision. |
| `NO_DECISION_REFERENCED` | block | High-impact change with no decision reference in PR/commit. |
| `DECISION_NOT_FOUND` | block | Referenced decision ID does not exist in the workspace. |
| `DECISION_NOT_APPROVED` | block | Referenced decision is not in "approved" status. |
| `LINKED_PR_REQUIRED` | block | Policy requires a linked PR on the decision, but none found. |
| `DETERMINISTIC_RULE_VIOLATION` | block | One or more deterministic checks failed. |
| `JUDGE_BLOCKED` | block | LLM Judge determined the change does not align. |
| `JUDGE_LOW_CONFIDENCE` | block | LLM Judge confidence below the configured threshold. |
| `JUDGE_UNAVAILABLE` | block | LLM Judge could not be reached or returned an error. |
| `OVERRIDE` | pass | A previously blocked record was overridden with justification. |
| `POLICY_VIOLATION` | block | Generic policy violation not covered by other codes. |
