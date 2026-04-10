# ISO/IEC 42001 — AI Management System: Decern Evidence Mapping

> **Disclaimer**: This document maps Decern capabilities to relevant ISO/IEC 42001 controls. Decern provides evidence that supports compliance efforts but does not by itself make an organization compliant. ISO/IEC 42001 certification requires a comprehensive AI management system, external audit, and organizational commitment.

## Relevant Annex A Controls

### A.6.2.4 — AI system change management

> The organization shall establish, implement and maintain a process for managing changes to AI systems.

**Decern evidence**:
- Every code change evaluated by the gate produces a signed, hash-chained `EvidenceRecord` documenting what changed (`diff_hash`, `diff_files_touched`), what rule was applied (`decision_id`, `decision_content_hash`), and the outcome (`verdict`, `reason_code`).
- The hash chain provides tamper-evident sequencing of all changes within a workspace.
- Export bundles provide verifiable offline records.

**Customer responsibility**: Integrate Decern into the CI pipeline for all repositories where AI-assisted code generation is used.

### A.6.2.5 — Recording and logging

> The organization shall log AI system activities to ensure traceability.

**Decern evidence**:
- `evidence_records` table provides immutable, signed logs of every gate run.
- `evidence_access_log` table records who accessed evidence data, when, and how.
- `judge_invocation` field logs the full LLM interaction metadata (model, prompt hash, response hash, latency, token usage).

**Customer responsibility**: Configure evidence retention to meet organizational requirements (default: 730 days).

### A.6.2.6 — Monitoring of AI systems

> The organization shall monitor AI system performance and behavior.

**Decern evidence**:
- `confidence_percent` scores over time provide a performance signal for the Judge.
- Gate run statistics (pass/block/warn rates) are visible in the dashboard.
- Tip hash publishing provides externally anchored checkpoints for integrity monitoring.

**Customer responsibility**: Establish periodic review of Judge accuracy and confidence trends.

### A.8.4 — Documentation

> The organization shall maintain documentation of AI system lifecycle processes.

**Decern evidence**:
- Evidence records are self-documenting (schema version, all fields, timestamps).
- Export bundles include `manifest.json`, `VERIFICATION.md`, and bundled public keys.
- `docs/evidence/SCHEMA.md` provides field-level documentation.

**Customer responsibility**: Maintain architecture decisions (ADRs) as the human-authored documentation layer.

### A.8.5 — Data management

> The organization shall establish processes for AI system data management.

**Decern evidence**:
- Diff and decision content are hashed (not stored in the evidence record), preserving integrity without retaining potentially sensitive code.
- Evidence records include metadata about the data processed (`diff_size_bytes`, `diff_files_touched`).
- Retention policies are configurable per workspace.

**Customer responsibility**: Ensure sensitive data is not inadvertently included in decision content or PR descriptions.

### A.10.2 — Conformity assessment

> The organization shall ensure AI system outputs are assessed for conformity.

**Decern evidence**:
- Deterministic checks provide reproducible conformity assessment.
- The `deterministic_only` judge mode ensures conformity decisions are fully reproducible.
- Each check result includes a `details_hash` for auditability.

**Customer responsibility**: Define deterministic check configurations on decisions that map to organizational conformity requirements.

## Gaps

| Control | Status | Notes |
|---------|--------|-------|
| A.6.2.3 — Risk assessment of AI | Not addressed | Decern evaluates code changes, not AI risk. Risk assessment is an organizational process. |
| A.7 — Support (competence, awareness) | Not addressed | Training and awareness are organizational responsibilities. |
| A.9 — Performance evaluation | Partial | Decern provides data (confidence trends) but does not perform the evaluation. |
