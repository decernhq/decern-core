-- Expand Free plan: unlimited projects (observation mode on any number of repos).
update public.plans
set
  projects_limit = -1,
  updated_at = now()
where id = 'free';
