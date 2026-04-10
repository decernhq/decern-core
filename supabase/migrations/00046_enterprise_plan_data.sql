-- Add enterprise plan row (was missing — only free/team/business existed).
-- Enterprise has unlimited everything.

INSERT INTO public.plans (id, name, description, price_cents, stripe_price_id, workspaces_limit, projects_limit, users_per_workspace_limit, decisions_limit, ai_generations_per_month)
VALUES ('enterprise', 'Enterprise / Self-Hosted', 'Full control', 0, NULL, -1, -1, -1, -1, -1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  workspaces_limit = EXCLUDED.workspaces_limit,
  projects_limit = EXCLUDED.projects_limit,
  users_per_workspace_limit = EXCLUDED.users_per_workspace_limit,
  decisions_limit = EXCLUDED.decisions_limit,
  ai_generations_per_month = EXCLUDED.ai_generations_per_month,
  updated_at = now();
