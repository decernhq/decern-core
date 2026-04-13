-- Restore get_plan_limits() function dropped by the CASCADE in migration 00050.
-- Used by the dashboard to check workspace creation limits, AI usage, etc.

CREATE OR REPLACE FUNCTION public.get_plan_limits(p_user_id uuid)
RETURNS TABLE (
  workspaces_limit int,
  projects_limit int,
  users_per_workspace_limit int,
  decisions_limit int,
  ai_generations_per_month int
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    coalesce(s.limit_workspaces, p.workspaces_limit),
    coalesce(s.limit_projects, p.projects_limit),
    coalesce(s.limit_users_per_workspace, p.users_per_workspace_limit),
    coalesce(s.limit_decisions, p.decisions_limit),
    coalesce(s.limit_ai_per_month, p.ai_generations_per_month)
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.user_id = p_user_id AND s.status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT p.workspaces_limit, p.projects_limit, p.users_per_workspace_limit, p.decisions_limit, p.ai_generations_per_month
    FROM public.plans p WHERE p.id = 'free';
  END IF;
END;
$$;
