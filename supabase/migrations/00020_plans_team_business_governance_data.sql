-- Update free plan limits and insert team, business, governance.
-- Run after 00019 so the new enum values are visible.

-- Update free plan limits (1 workspace, 1 project, unlimited decisions, 10 AI)
update public.plans
set
  workspaces_limit = 1,
  projects_limit = 1,
  users_per_workspace_limit = 1,
  decisions_limit = -1,
  ai_generations_per_month = 10,
  name = 'Free',
  description = 'To get started',
  updated_at = now()
where id = 'free';

-- Insert new plans (team/business prices in EUR cents at migration time; 00036 updates to 19€ / 59€)
insert into public.plans (id, name, description, price_cents, stripe_price_id, workspaces_limit, projects_limit, users_per_workspace_limit, decisions_limit, ai_generations_per_month)
values
  ('team', 'Team', 'For growing teams', 4900, null, 1, -1, 10, -1, 500),
  ('business', 'Business', 'For organizations', 9900, null, -1, -1, 20, -1, 1500),
  ('governance', 'Governance / On Prem', 'Let''s Talk', 0, null, -1, -1, -1, -1, -1)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  workspaces_limit = excluded.workspaces_limit,
  projects_limit = excluded.projects_limit,
  users_per_workspace_limit = excluded.users_per_workspace_limit,
  decisions_limit = excluded.decisions_limit,
  ai_generations_per_month = excluded.ai_generations_per_month,
  updated_at = now();

-- Migrate subscriptions: pro -> team, ultra -> business
update public.subscriptions set plan_id = 'team' where plan_id = 'pro';
update public.subscriptions set plan_id = 'business' where plan_id = 'ultra';
