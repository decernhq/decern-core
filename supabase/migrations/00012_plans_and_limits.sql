-- Piani (Free, Pro, Ultra, Enterprise) con limiti in DB.
-- Enterprise: limiti impostati su subscription (override).
-- I valori enum 'ultra' e 'enterprise' sono aggiunti in 00012_plan_id_enum_ultra_enterprise.sql.

-- Tabella piani: limiti predefiniti per ogni piano
create table if not exists public.plans (
  id plan_id primary key,
  name text not null,
  description text,
  price_cents int not null default 0,
  stripe_price_id text,
  workspaces_limit int not null,
  projects_limit int not null,
  users_per_workspace_limit int not null,
  decisions_limit int not null,
  ai_generations_per_month int not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.plans is 'Limiti per piano. -1 = illimitato. Enterprise usa override su subscriptions.';

-- Inserisci definizioni (idem tipo billing, poi leggeremo da qui)
insert into public.plans (id, name, description, price_cents, workspaces_limit, projects_limit, users_per_workspace_limit, decisions_limit, ai_generations_per_month)
values
  ('free', 'Free', 'Per provare il flusso', 0, 1, 1, 1, 30, 5),
  ('pro', 'Pro', 'Freelance e piccoli team', 1900, 1, -1, 5, -1, 300),
  ('ultra', 'Ultra', 'Team di prodotto/engineering', 4900, -1, -1, 20, -1, 1500),
  ('enterprise', 'Enterprise', 'Let''s talk', 0, -1, -1, -1, -1, -1)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  workspaces_limit = excluded.workspaces_limit,
  projects_limit = excluded.projects_limit,
  users_per_workspace_limit = excluded.users_per_workspace_limit,
  decisions_limit = excluded.decisions_limit,
  ai_generations_per_month = excluded.ai_generations_per_month;

-- Override limiti per Enterprise (solo per plan_id = enterprise)
alter table public.subscriptions
  add column if not exists limit_workspaces int,
  add column if not exists limit_projects int,
  add column if not exists limit_users_per_workspace int,
  add column if not exists limit_decisions int,
  add column if not exists limit_ai_per_month int;

comment on column public.subscriptions.limit_workspaces is 'Override per enterprise: limite workspaces (solo se plan_id=enterprise)';

-- Uso generazioni AI: conteggio per utente per mese
create table if not exists public.ai_generations_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  period text not null,
  count int not null default 0,
  unique(user_id, period)
);

comment on table public.ai_generations_usage is 'Conteggio generazioni AI per utente per mese (period = YYYY-MM)';

alter table public.ai_generations_usage enable row level security;

create policy "Users can view own ai usage"
  on public.ai_generations_usage for select
  using (auth.uid() = user_id);

create index ai_generations_usage_user_period_idx on public.ai_generations_usage(user_id, period);

create policy "Users can insert own ai usage"
  on public.ai_generations_usage for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ai usage"
  on public.ai_generations_usage for update
  using (auth.uid() = user_id);

-- Limiti effettivi per un user (da plans + override enterprise). Se non ha subscription attiva, ritorna limiti free.
create or replace function public.get_plan_limits(p_user_id uuid)
returns table (
  workspaces_limit int,
  projects_limit int,
  users_per_workspace_limit int,
  decisions_limit int,
  ai_generations_per_month int
)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  select
    coalesce(s.limit_workspaces, p.workspaces_limit),
    coalesce(s.limit_projects, p.projects_limit),
    coalesce(s.limit_users_per_workspace, p.users_per_workspace_limit),
    coalesce(s.limit_decisions, p.decisions_limit),
    coalesce(s.limit_ai_per_month, p.ai_generations_per_month)
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = p_user_id and s.status = 'active'
  limit 1;
  if not found then
    return query select p.workspaces_limit, p.projects_limit, p.users_per_workspace_limit, p.decisions_limit, p.ai_generations_per_month
    from public.plans p where p.id = 'free';
  end if;
end;
$$;
