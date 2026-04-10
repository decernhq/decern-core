-- Evidence records: audit-grade, hash-chained, signed gate run evidence.
-- Schema version: decern_evidence_v1

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
  decision_version text NOT NULL DEFAULT '1',
  decision_content_hash text NOT NULL,
  diff_hash text NOT NULL,
  diff_size_bytes integer NOT NULL DEFAULT 0,
  diff_files_touched text[] NOT NULL DEFAULT '{}',
  judge_invocation jsonb,
  deterministic_checks jsonb NOT NULL DEFAULT '[]',
  verdict text NOT NULL,
  reason_code text NOT NULL,
  reason_detail text NOT NULL DEFAULT '',
  override_data jsonb,
  previous_evidence_hash text,
  current_evidence_hash text NOT NULL,
  signature jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.evidence_records IS 'Audit-grade evidence records for gate runs. Hash-chained per workspace, cryptographically signed.';
COMMENT ON COLUMN public.evidence_records.evidence_id IS 'UUID v7 (time-ordered).';
COMMENT ON COLUMN public.evidence_records.decision_content_hash IS 'SHA-256 of the canonical decision content at evaluation time.';
COMMENT ON COLUMN public.evidence_records.diff_hash IS 'SHA-256 of the canonical diff analyzed.';
COMMENT ON COLUMN public.evidence_records.previous_evidence_hash IS 'SHA-256 of the previous record in the workspace chain. NULL for the first record.';
COMMENT ON COLUMN public.evidence_records.current_evidence_hash IS 'SHA-256 of canonical JSON of all fields (excl. signature and current_evidence_hash) concatenated with previous_evidence_hash.';

CREATE INDEX evidence_records_workspace_ts ON public.evidence_records (workspace_id, timestamp_utc DESC);
CREATE INDEX evidence_records_workspace_hash ON public.evidence_records (workspace_id, current_evidence_hash);

-- Chain tip: tracks the latest evidence hash per workspace for append operations.
CREATE TABLE public.evidence_chain_tips (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tip_evidence_id uuid NOT NULL REFERENCES public.evidence_records(evidence_id),
  tip_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.evidence_chain_tips IS 'Latest evidence record hash per workspace. Used for hash chain append.';

-- Access log: immutable record of who accessed evidence data.
CREATE TABLE public.evidence_access_log (
  access_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp_utc timestamptz NOT NULL DEFAULT timezone('utc', now()),
  actor_identity jsonb NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  evidence_ids_accessed text[],
  query_descriptor text,
  access_method text NOT NULL,
  source_ip text,
  user_agent text
);

COMMENT ON TABLE public.evidence_access_log IS 'Append-only log of evidence record access. Not hash-chained (v1 design choice).';

CREATE INDEX evidence_access_log_workspace_ts ON public.evidence_access_log (workspace_id, timestamp_utc DESC);

-- RLS: evidence_records
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view evidence records"
  ON public.evidence_records FOR SELECT
  USING (public.can_view_workspace_members(workspace_id, auth.uid()));

-- RLS: evidence_chain_tips (read-only for members)
ALTER TABLE public.evidence_chain_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view chain tips"
  ON public.evidence_chain_tips FOR SELECT
  USING (public.can_view_workspace_members(workspace_id, auth.uid()));

-- RLS: evidence_access_log (admin-only read, no client inserts)
ALTER TABLE public.evidence_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can view access log"
  ON public.evidence_access_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = evidence_access_log.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.workspace_role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = evidence_access_log.workspace_id
    AND w.owner_id = auth.uid()
  ));

-- Extend workspace_policies with evidence settings
ALTER TABLE public.workspace_policies
  ADD COLUMN IF NOT EXISTS judge_mode text NOT NULL DEFAULT 'advisory'
    CHECK (judge_mode IN ('advisory', 'deterministic_only')),
  ADD COLUMN IF NOT EXISTS evidence_retention_days integer NOT NULL DEFAULT 730
    CHECK (evidence_retention_days >= 30);

COMMENT ON COLUMN public.workspace_policies.judge_mode IS 'advisory: LLM Judge contributes to verdict. deterministic_only: verdict from deterministic checks only, Judge is recorded as advisory.';
COMMENT ON COLUMN public.workspace_policies.evidence_retention_days IS 'Days to retain evidence records before archival. Default 730 (2 years). Minimum 30.';

-- Add checks column to decisions for deterministic check configuration
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS checks jsonb DEFAULT NULL;

COMMENT ON COLUMN public.decisions.checks IS 'Deterministic check configuration (path_denylist, dependency_denylist, regex, etc.). NULL = no deterministic checks.';
