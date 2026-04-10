# EU AI Act Article 14 — Human Oversight: Decern Evidence Mapping

> **Disclaimer**: This document maps Decern capabilities to Article 14 requirements. Decern provides evidence for compliance efforts but does not by itself make an organization compliant with the EU AI Act. Compliance requires a holistic assessment that includes organizational processes, risk management, and legal review.

## Article 14 — Measures for Human Oversight

Art. 14 requires that high-risk AI systems are designed to allow effective oversight by natural persons during the period of use.

### 14(1) — Design for human oversight

> High-risk AI systems shall be designed and developed in such a way [...] that they can be effectively overseen by natural persons during the period in which the system is used.

**Decern evidence**:
- Every gate run produces an `EvidenceRecord` with the `verdict`, `reason_code`, and `reason_detail` fields, documenting the AI system's output and the rationale.
- The `judge_invocation` field records the exact LLM model, prompt hash, response hash, and confidence score — enabling post-hoc review of the AI's reasoning.
- The `deterministic_only` judge mode allows organizations to use the AI system in a purely advisory capacity while enforcement is driven by human-defined deterministic rules.

**Customer responsibility**: Define and maintain the architecture decisions (ADRs) that the AI evaluates against. These are the human-authored rules that constitute the oversight framework.

### 14(2) — Appropriate interface tools

> Human oversight measures shall be [...] provided to the deployer before the high-risk AI system is placed on the market or put into service.

**Decern evidence**:
- The dashboard provides visibility into all gate runs, verdicts, and confidence scores.
- The `override` workflow allows authorized humans to override AI-driven blocks with mandatory justification (`override_reason`, 20-1000 chars).
- Export bundles provide offline access to the full evidence chain for external review.

**Customer responsibility**: Ensure that personnel with oversight responsibilities have access to the Decern dashboard and understand how to interpret evidence records.

### 14(3)(a) — Understanding capabilities and limitations

> Correctly interpret the high-risk AI system's output.

**Decern evidence**:
- `confidence` score (0-100%) and `reason_detail` provide interpretable output.
- `advisory_message` field surfaces the Judge's explanation when confidence is below threshold.
- `deterministic_checks` results are fully reproducible and interpretable.

**Customer responsibility**: Train team members on how Decern verdicts map to their architectural governance process.

### 14(3)(b) — Awareness of automation bias

> Remain aware of the possible tendency of automatically relying on [...] output.

**Decern evidence**:
- The `deterministic_only` judge mode prevents automated reliance on LLM output for enforcement.
- In `advisory` mode, the `advisory` flag distinguishes between blocking and advisory verdicts.
- The evidence record separately captures `judge_invocation` (AI output) and `deterministic_checks` (rule-based output), making the distinction explicit.

**Customer responsibility**: Establish processes to periodically review Judge verdicts for accuracy and bias. Decern does not automatically detect or correct AI bias.

### 14(3)(c) — Correctly interpret output in context

> Take into account relevant circumstances, including notably input data characteristics.

**Decern evidence**:
- `diff_hash`, `diff_size_bytes`, and `diff_files_touched` document the input.
- `decision_content_hash` documents the rule that was applied.
- `repository_identifier` and `ci_provider` document the context.

**Customer responsibility**: Ensure decisions are maintained and updated to reflect current architectural intent.

### 14(4) — Ability to override or disregard output

> The natural persons to whom human oversight is assigned have the ability to [...] override or reverse the output of the high-risk AI system.

**Decern evidence**:
- The `override` workflow provides a tracked mechanism to override blocked PRs.
- Override records include `overridden_by` (identity), `override_reason` (justification), `override_timestamp`, and `override_auth_method`.
- Override records are part of the same hash chain, providing an immutable audit trail.

**Customer responsibility**: Define which personnel are authorized to issue overrides. Decern authenticates the override actor but does not enforce organizational authorization hierarchies beyond workspace membership.

## Gaps

| Requirement | Status | Notes |
|-------------|--------|-------|
| Art. 14(3)(d) — Stop or interrupt the system | Partial | Users can disable the gate in CI config. Decern does not provide a "kill switch" within the product. |
| Art. 14(2) — Provided before market placement | N/A | Decern is a tool, not a high-risk AI system itself. The mapping applies to customers using Decern as part of their AI oversight framework. |
