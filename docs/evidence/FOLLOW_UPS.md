# Evidence Layer: Follow-ups

Items identified during implementation that are out of scope for v1 but should be addressed.

## Implementation follow-ups

- **Dashboard migration**: Migrate the dashboard gate-runs page to read from `evidence_records` instead of `judge_gate_runs`. Currently both tables are written to for backward compatibility.
- **Export bundle CLI**: The `export-bundle` and `verify-evidence` gate CLI subcommands need full integration with the cloud API export endpoint.
- **Tip hash publishing**: The cron job for publishing tip hashes to an external log needs the S3/storage integration for SaaS.
- **Cold storage**: The evidence archival cron job currently flags records as archived in PostgreSQL. Actual S3 Glacier integration is deferred.
- **CI status update on override**: The override endpoint should update the GitHub/GitLab commit status to allow merge. Requires GitHub App or OAuth token access server-side.

## KMS integrations (stub only in v1)

- AWS KMS Ed25519 signing key integration
- GCP Cloud KMS integration
- HashiCorp Vault Transit engine integration
- PKCS#11 HSM integration

## Protocol improvements

- RFC 3161 timestamping (TSA): integrate with a public TSA for legally binding timestamps. The `timestamp_source` field already supports this.
- UUID v7 generation: currently using a placeholder; should use a proper UUID v7 library or implementation.
- Decision versioning: decisions don't currently have a version field. The `decision_version` in evidence records defaults to "1". Add proper versioning to the decisions table.

## Observability

- Real-time chain integrity monitoring (alert if a break is detected)
- Override rate alerting (unusual override frequency)
- Judge confidence trend tracking
- Evidence record write failure alerting

## Security

- CI token rotation mechanism (currently one token per workspace, no rotation)
- Signing key rotation automation
- Evidence record field-level encryption for sensitive metadata
