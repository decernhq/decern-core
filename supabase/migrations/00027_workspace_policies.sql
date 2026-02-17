-- Workspace policies for Decision Gate (Business+): stored per workspace, used by validate/judge when not overridden by query params.

create table public.workspace_policies (
  workspace_id uuid references public.workspaces(id) on delete cascade primary key,
  require_linked_pr boolean not null default false,
  require_approved boolean not null default true,
  enforce boolean not null default true,
  judge_blocking boolean not null default true,
  judge_tolerance_percent int check (judge_tolerance_percent is null or (judge_tolerance_percent >= 0 and judge_tolerance_percent <= 100)),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.workspace_policies is 'Decision Gate policies per workspace (Business+). Query params on validate/judge override these when provided.';

alter table public.workspace_policies enable row level security;

create policy "Workspace owner can select and update workspace_policies"
  on public.workspace_policies for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
