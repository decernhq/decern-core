-- Restore RLS policies that were dropped by the CASCADE in migration 00050.
--
-- Root cause: 00050 ran `DROP FUNCTION public.can_view_workspace_members CASCADE;`
-- which, per PostgreSQL semantics, drops every policy whose USING/WITH CHECK
-- expression referenced that function. The migration then recreated the
-- function but NOT the dependent policies. Result: every v2 table that relied
-- on that function for SELECT RLS became default-deny, and the dashboard
-- showed empty lists for ADRs, signals, gate runs, workspace members,
-- invitations, and workspace visibility for non-owners.
--
-- This migration re-applies every v2-relevant policy using an idempotent
-- DROP-IF-EXISTS + CREATE pattern so it can be replayed safely.

-- ── workspaces ──
DROP POLICY IF EXISTS "Workspace members can view workspace" ON public.workspaces;
CREATE POLICY "Workspace members can view workspace"
  ON public.workspaces FOR SELECT
  USING (public.can_view_workspace_members(workspaces.id, auth.uid()));

-- ── workspace_members ──
DROP POLICY IF EXISTS "Workspace owner and members can view workspace_members" ON public.workspace_members;
CREATE POLICY "Workspace owner and members can view workspace_members"
  ON public.workspace_members FOR SELECT
  USING (public.can_view_workspace_members(workspace_id, auth.uid()));

-- ── workspace_invitations ──
DROP POLICY IF EXISTS "Workspace owner and members can view workspace_invitations" ON public.workspace_invitations;
CREATE POLICY "Workspace owner and members can view workspace_invitations"
  ON public.workspace_invitations FOR SELECT
  USING (public.can_view_workspace_members(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Invited user can read own pending workspace invitation" ON public.workspace_invitations;
CREATE POLICY "Invited user can read own pending workspace invitation"
  ON public.workspace_invitations FOR SELECT
  USING (
    (status = 'pending' AND expires_at > now() AND email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
    OR public.can_view_workspace_members(workspace_id, auth.uid())
  );

-- ── evidence_records ──
DROP POLICY IF EXISTS "Workspace members can view evidence records" ON public.evidence_records;
CREATE POLICY "Workspace members can view evidence records"
  ON public.evidence_records FOR SELECT
  USING (public.can_view_workspace_members(workspace_id, auth.uid()));

-- ── evidence_chain_tips ──
DROP POLICY IF EXISTS "Workspace members can view chain tips" ON public.evidence_chain_tips;
CREATE POLICY "Workspace members can view chain tips"
  ON public.evidence_chain_tips FOR SELECT
  USING (public.can_view_workspace_members(workspace_id, auth.uid()));

-- ── adr_cache ──
DROP POLICY IF EXISTS "Workspace members can view ADR cache" ON public.adr_cache;
CREATE POLICY "Workspace members can view ADR cache"
  ON public.adr_cache FOR SELECT
  USING (public.can_view_workspace_members(workspace_id, auth.uid()));

-- ── case_c_signals ──
DROP POLICY IF EXISTS "Workspace members can view signals" ON public.case_c_signals;
CREATE POLICY "Workspace members can view signals"
  ON public.case_c_signals FOR SELECT
  USING (public.can_view_workspace_members(workspace_id, auth.uid()));
