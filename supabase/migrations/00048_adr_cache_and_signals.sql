-- ADR cache: index of ADR files from the repo, synced by gate CLI
CREATE TABLE IF NOT EXISTS public.adr_cache (
  id text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'proposed',
  enforcement text NOT NULL DEFAULT 'warning',
  scope text[] NOT NULL DEFAULT '{}',
  content_hash text NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id)
);

COMMENT ON TABLE public.adr_cache IS 'Cache/index of ADR files from the repo. Source of truth is the repo; this is for dashboard and drift report.';

ALTER TABLE public.adr_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view ADR cache"
  ON public.adr_cache FOR SELECT
  USING (public.can_view_workspace_members(workspace_id, auth.uid()));

-- Case C signals: new architectural decisions detected in PRs, not yet formalized as ADRs
CREATE TABLE IF NOT EXISTS public.case_c_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pr_url text,
  pr_title text,
  description text NOT NULL,
  suggested_adr_title text,
  files_involved text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  evidence_id uuid REFERENCES public.evidence_records(evidence_id),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.case_c_signals IS 'Signals from Case C: PR introduces new decisions not covered by any ADR. Used for drift reports.';
COMMENT ON COLUMN public.case_c_signals.status IS 'open = not yet reviewed, formalized = became an ADR, dismissed = not a real decision';

CREATE INDEX case_c_signals_workspace_ts ON public.case_c_signals(workspace_id, created_at DESC);

ALTER TABLE public.case_c_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view signals"
  ON public.case_c_signals FOR SELECT
  USING (public.can_view_workspace_members(workspace_id, auth.uid()));
