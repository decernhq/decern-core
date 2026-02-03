-- Workspace: contenitore per progetti. Gli inviti sono a livello workspace.
-- Un utente vede tutti i progetti del workspace di cui è owner o member.

create table public.workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'Mio workspace',
  owner_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workspaces enable row level security;

create policy "Workspace owner can do all"
  on public.workspaces for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index workspaces_owner_id_idx on public.workspaces(owner_id);

-- workspace_members: utenti invitati al workspace (oltre l'owner)
create table public.workspace_members (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create or replace function public.can_view_workspace_members(p_workspace_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.workspaces where id = p_workspace_id and owner_id = p_user_id)
  or exists (select 1 from public.workspace_members where workspace_id = p_workspace_id and user_id = p_user_id);
$$;

create policy "Workspace owner and members can view workspace_members"
  on public.workspace_members for select
  using (public.can_view_workspace_members(workspace_id, auth.uid()));

create policy "Workspace owner can insert workspace_members"
  on public.workspace_members for insert
  with check (exists (select 1 from public.workspaces where id = workspace_id and owner_id = auth.uid()));

create policy "Owner can delete members, user can leave"
  on public.workspace_members for delete
  using (
    exists (select 1 from public.workspaces where id = workspace_id and owner_id = auth.uid())
    or user_id = auth.uid()
  );

create index workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index workspace_members_user_id_idx on public.workspace_members(user_id);

create policy "Workspace members can view workspace"
  on public.workspaces for select
  using (public.can_view_workspace_members(workspaces.id, auth.uid()));

-- workspace_invitations: inviti pendenti per email
create table public.workspace_invitations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  email text not null,
  invited_by uuid references public.profiles(id) on delete cascade not null,
  token text not null unique,
  expires_at timestamp with time zone not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workspace_invitations enable row level security;

create policy "Workspace owner and members can view workspace_invitations"
  on public.workspace_invitations for select
  using (public.can_view_workspace_members(workspace_id, auth.uid()));

create policy "Workspace owner can insert workspace_invitations"
  on public.workspace_invitations for insert
  with check (exists (select 1 from public.workspaces where id = workspace_id and owner_id = auth.uid()));

create policy "Workspace owner can update workspace_invitations"
  on public.workspace_invitations for update
  using (exists (select 1 from public.workspaces where id = workspace_id and owner_id = auth.uid()));

create policy "Invited user can accept workspace invitation"
  on public.workspace_invitations for update
  using (
    status = 'pending' and expires_at > now() and email = (select email from public.profiles where id = auth.uid())
  )
  with check (status = 'accepted');

create policy "Workspace owner can delete workspace_invitations"
  on public.workspace_invitations for delete
  using (exists (select 1 from public.workspaces where id = workspace_id and owner_id = auth.uid()));

create policy "Invited user can read own pending workspace invitation"
  on public.workspace_invitations for select
  using (
    (status = 'pending' and expires_at > now() and email = (select email from public.profiles where id = auth.uid()))
    or public.can_view_workspace_members(workspace_id, auth.uid())
  );

create unique index workspace_invitations_pending_email_idx on public.workspace_invitations(workspace_id, email) where (status = 'pending');
create index workspace_invitations_workspace_id_idx on public.workspace_invitations(workspace_id);
create index workspace_invitations_token_idx on public.workspace_invitations(token);

-- Invited user can join workspace_members when they have a pending workspace invitation
create policy "Invited user can join with pending workspace invitation"
  on public.workspace_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workspace_invitations wi
      where wi.workspace_id = workspace_members.workspace_id
      and wi.email = (select email from public.profiles where id = auth.uid())
      and wi.status = 'pending' and wi.expires_at > now()
    )
  );

-- Aggiungi workspace_id ai progetti e backfill
alter table public.projects add column workspace_id uuid references public.workspaces(id) on delete cascade;

insert into public.workspaces (name, owner_id)
select distinct 'Mio workspace', owner_id from public.projects;

update public.projects p
set workspace_id = (select id from public.workspaces w where w.owner_id = p.owner_id limit 1);

alter table public.projects alter column workspace_id set not null;
create index projects_workspace_id_idx on public.projects(workspace_id);

-- Migra project_members -> workspace_members (stessi utenti nel workspace del progetto)
insert into public.workspace_members (workspace_id, user_id)
select distinct p.workspace_id, pm.user_id
from public.project_members pm
join public.projects p on p.id = pm.project_id
on conflict (workspace_id, user_id) do nothing;

-- RLS progetti: accesso se sei owner del workspace o member
drop policy if exists "Users can view own or member projects" on public.projects;
drop policy if exists "Users can create projects" on public.projects;
drop policy if exists "Users can update own projects" on public.projects;
drop policy if exists "Users can delete own projects" on public.projects;

create policy "Users can view projects in their workspace"
  on public.projects for select
  using (public.can_view_workspace_members(workspace_id, auth.uid()));

create policy "Users can create projects in their workspace"
  on public.projects for insert
  with check (public.can_view_workspace_members(workspace_id, auth.uid()));

create policy "Users can update projects in their workspace"
  on public.projects for update
  using (public.can_view_workspace_members(workspace_id, auth.uid()));

create policy "Users can delete projects in their workspace"
  on public.projects for delete
  using (public.can_view_workspace_members(workspace_id, auth.uid()));

-- RLS decisions: via workspace del progetto
drop policy if exists "Users can view decisions from own or member projects" on public.decisions;
drop policy if exists "Users can create decisions in own or member projects" on public.decisions;
drop policy if exists "Users can update decisions in own or member projects" on public.decisions;
drop policy if exists "Users can delete decisions in own or member projects" on public.decisions;

create policy "Users can view decisions in their workspace"
  on public.decisions for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = decisions.project_id and public.can_view_workspace_members(p.workspace_id, auth.uid())
    )
  );

create policy "Users can create decisions in their workspace"
  on public.decisions for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.can_view_workspace_members(p.workspace_id, auth.uid())
    )
  );

create policy "Users can update decisions in their workspace"
  on public.decisions for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = decisions.project_id and public.can_view_workspace_members(p.workspace_id, auth.uid())
    )
  );

create policy "Users can delete decisions in their workspace"
  on public.decisions for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = decisions.project_id and public.can_view_workspace_members(p.workspace_id, auth.uid())
    )
  );

-- Profili: visibili se nella stessa workspace
drop policy if exists "Users can view profiles in same project" on public.profiles;

create policy "Users can view profiles in same workspace"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.workspaces w
      where (w.owner_id = auth.uid() or exists (select 1 from public.workspace_members wm where wm.workspace_id = w.id and wm.user_id = auth.uid()))
      and (w.owner_id = profiles.id or exists (select 1 from public.workspace_members wm2 where wm2.workspace_id = w.id and wm2.user_id = profiles.id))
    )
  );

-- Funzione per pagina accetta invito (workspace)
create or replace function public.get_workspace_invitation_by_token(tok text)
returns table (id uuid, workspace_id uuid, workspace_name text, email text, expires_at timestamptz)
language sql security definer set search_path = public as $$
  select wi.id, wi.workspace_id, w.name, wi.email, wi.expires_at
  from public.workspace_invitations wi
  join public.workspaces w on w.id = wi.workspace_id
  where wi.token = tok and wi.status = 'pending' and wi.expires_at > now();
$$;

-- Rimuovi tabelle e policy a livello progetto (inviti/membri)
drop policy if exists "Invited user can join with pending invitation" on public.project_members;
drop policy if exists "Owner can delete members, user can leave" on public.project_members;
drop policy if exists "Project owner can insert project_members" on public.project_members;
drop policy if exists "Project owner and members can view project_members" on public.project_members;

drop policy if exists "Invited user can read own pending invitation" on public.project_invitations;
drop policy if exists "Project owner can delete invitations" on public.project_invitations;
drop policy if exists "Invited user can accept invitation" on public.project_invitations;
drop policy if exists "Project owner can update invitations" on public.project_invitations;
drop policy if exists "Project owner can insert invitations" on public.project_invitations;
drop policy if exists "Project owner and members can view invitations" on public.project_invitations;

drop table if exists public.project_invitations;
drop table if exists public.project_members;
drop function if exists public.get_invitation_by_token(text);
drop function if exists public.can_view_project_members(uuid, uuid);

-- Trigger updated_at per workspaces
create trigger update_workspaces_updated_at
  before update on public.workspaces
  for each row execute procedure public.update_updated_at_column();
