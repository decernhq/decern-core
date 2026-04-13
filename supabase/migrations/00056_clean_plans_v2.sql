-- Clean plans table for v2: remove legacy limits (projects, decisions, ai_generations).
-- v2 doesn't have projects or decisions tables. AI generation usage is tracked
-- via cloud LLM (CLOUD_LLM_API_KEY), not per-user metering.
--
-- Remaining limits: workspaces_limit, users_per_workspace_limit.
-- Draft ADR generation is gated by isPaidWorkspace() (subscription check), not by a counter.

-- Remove legacy plan rows (pro, ultra, team, business) that no longer exist
DELETE FROM public.plans WHERE id NOT IN ('free', 'enterprise');

-- Update free plan: v2 reality
UPDATE public.plans SET
  name = 'Free',
  description = 'Get started',
  workspaces_limit = 1,
  users_per_workspace_limit = 3,
  projects_limit = -1,
  decisions_limit = -1,
  ai_generations_per_month = -1
WHERE id = 'free';

-- Update enterprise plan: v2 reality
UPDATE public.plans SET
  name = 'Enterprise',
  description = 'Full control',
  workspaces_limit = -1,
  users_per_workspace_limit = -1,
  projects_limit = -1,
  decisions_limit = -1,
  ai_generations_per_month = -1
WHERE id = 'enterprise';
