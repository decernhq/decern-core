# SOC 2 Change Management — Decern Evidence Mapping

> **Disclaimer**: This document maps Decern capabilities to relevant SOC 2 Trust Services Criteria. Decern provides evidence that supports compliance efforts but does not by itself make an organization compliant. SOC 2 compliance requires a comprehensive control environment, external audit by a CPA firm, and organizational commitment across all trust service categories.

## Relevant Trust Services Criteria

### CC6.1 — Logical and physical access controls

> The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events.

**Decern evidence**:
- CI token authentication: gate runs are authenticated via SHA-256 hashed tokens, one per workspace.
- `author_identity` in evidence records identifies who triggered the change.
- `evidence_access_log` records every access to evidence data (actor, method, timestamp, source IP).
- RLS (Row-Level Security) enforces workspace-level data isolation.

**Customer responsibility**: Configure branch protection rules at the Git provider level. Manage workspace membership and CI token distribution.

### CC6.2 — Registration and authorization of users

> Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users.

**Decern evidence**:
- Workspace membership is tracked (`workspace_members` table with roles).
- Invitation system with time-bound tokens (`workspace_invitations`).
- Override actions record `overridden_by` identity and `override_auth_method`.

**Customer responsibility**: Implement access review processes. Decern does not enforce periodic access recertification.

### CC7.2 — Monitoring of system components

> The entity monitors system components and the operation of those components for anomalies.

**Decern evidence**:
- Hash chain integrity: `verifyChain()` detects any tampering with evidence records.
- Tip hash publishing provides externally anchored integrity checkpoints.
- Access log provides an audit trail of all evidence interactions.

**Customer responsibility**: Run periodic chain verification. Monitor for unexpected override patterns or access anomalies.

### CC8.1 — Changes to infrastructure and software

> The entity authorizes, designs, develops, configures, documents, tests, approves, and implements changes to infrastructure, technology, and software.

**Decern evidence**:
- Evidence records document each code change evaluation: `diff_hash`, `diff_files_touched`, `commit_sha`, `base_commit_sha`.
- `decision_id` and `decision_content_hash` link the change to an authorized architecture decision.
- `verdict` and `reason_code` document whether the change was approved or blocked.
- `override` object (when present) documents authorized exceptions with mandatory justification.
- `deterministic_checks` provide reproducible, auditable enforcement of specific rules.
- The hash chain provides tamper-evident ordering of all change evaluations.
- Cryptographic signatures provide non-repudiation of each evaluation record.

**Customer responsibility**:
- Maintain architecture decisions that reflect authorized change patterns.
- Configure deterministic checks for critical paths (database migrations, infrastructure, dependencies).
- Ensure the Decern gate is a required CI check (via branch protection rules).

### CC8.2 — Testing of changes

> Changes are tested before deployment.

**Decern evidence**:
- Decern evaluates changes before merge (pre-merge CI gate). This is evidence that a review/evaluation step exists.
- `diff_files_touched` documents what was evaluated.

**Customer responsibility**: Decern evaluates architectural alignment, not functional correctness. Separate testing processes (unit tests, integration tests, QA) are required.

### CC8.3 — Emergency changes

> Emergency changes are documented and authorized.

**Decern evidence**:
- The override workflow provides a tracked mechanism for emergency bypasses.
- Override records include `override_reason` (mandatory justification, 20-1000 chars).
- Override records are part of the same hash chain, providing an immutable audit trail.
- The absence of an override record for a merged PR where the gate blocked is itself evidence of an undocumented bypass (detectable during audit).

**Customer responsibility**: Define an emergency change process that includes the override workflow. Document when and by whom overrides are authorized.

## Evidence Export for SOC 2 Auditors

Auditors can verify Decern's controls using the export bundle:

1. **Request export**: `decern-gate export-bundle --workspace <id> --from <start> --to <end>`
2. **Verify integrity**: `decern-gate verify-evidence bundle.zip` — checks hash chain and signatures
3. **Review records**: `records.jsonl` contains all evidence records in chain order
4. **Review access log**: `access_log.jsonl` contains all access events
5. **Verify public keys**: `public_keys/` directory contains all signing keys

The verification is offline (no DB access needed) and deterministic.

## Gaps

| Criterion | Status | Notes |
|-----------|--------|-------|
| CC6.3 — Boundaries of system | Not addressed | Network boundary definition is an infrastructure responsibility. |
| CC6.6 — Threat and vulnerability management | Not addressed | Decern does not perform security scanning. |
| CC7.1 — Detection and response infrastructure | Partial | Decern provides logging and chain integrity. Detection and response processes are organizational. |
| CC8.2 — Functional testing | Not addressed | Decern evaluates architectural alignment, not functional correctness. |
