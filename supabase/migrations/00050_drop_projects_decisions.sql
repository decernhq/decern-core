-- Drop legacy v1 tables: decisions, projects.
-- v2 uses ADR markdown files in the repo (source of truth) + adr_cache table (cache/index).
-- Evidence records reference ADR IDs by string, no FK to decisions table.

-- Drop dependent objects first
DROP FUNCTION IF EXISTS public.increment_ai_usage_if_allowed(uuid);
DROP FUNCTION IF EXISTS public.get_plan_limits(uuid);
DROP FUNCTION IF EXISTS public.can_view_workspace_members(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_workspace_members(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_edit_workspace_decisions(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_approve_workspace_decisions(uuid, uuid) CASCADE;

DROP TABLE IF EXISTS public.decisions CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.ai_generations_usage CASCADE;

-- Recreate workspace membership helper (used by evidence_records, adr_cache, case_c_signals RLS)
CREATE OR REPLACE FUNCTION public.can_view_workspace_members(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = p_workspace_id AND w.owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id AND wm.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
