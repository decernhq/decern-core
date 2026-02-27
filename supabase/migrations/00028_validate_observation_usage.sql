-- Validate observation usage: Free plan limit (7 calls lifetime per workspace).
-- When limit exceeded, API returns message instead of status to nudge upgrade.

create table if not exists public.validate_observation_usage (
  workspace_id uuid references public.workspaces(id) on delete cascade primary key,
  count int not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.validate_observation_usage is 'Lifetime count of validate calls in observation mode (Free plan). After 7, API returns upgrade message instead of status.';

alter table public.validate_observation_usage enable row level security;

-- Atomic increment and return new count. Called by validate route when Free + observation.
create or replace function public.increment_validate_observation_count(p_workspace_id uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  new_count int;
begin
  insert into public.validate_observation_usage (workspace_id, count, updated_at)
  values (p_workspace_id, 1, timezone('utc', now()))
  on conflict (workspace_id) do update set
    count = public.validate_observation_usage.count + 1,
    updated_at = timezone('utc', now())
  returning count into new_count;
  return new_count;
end;
$$;
