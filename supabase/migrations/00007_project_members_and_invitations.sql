-- Project members: users invited to a project (besides the owner)
create table public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, user_id)
);

alter table public.project_members enable row level security;

-- Only project owner or existing members can see members
create policy "Project owner and members can view project_members"
  on public.project_members for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_members.project_id
      and (p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid()
      ))
    )
  );

-- Project owner can add members
create policy "Project owner can insert project_members"
  on public.project_members for insert
  with check (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  );

-- Project owner can remove any member; user can remove themselves (leave)
create policy "Owner can delete members, user can leave"
  on public.project_members for delete
  using (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
    or user_id = auth.uid()
  );

create index project_members_project_id_idx on public.project_members(project_id);
create index project_members_user_id_idx on public.project_members(user_id);


-- Project invitations: pending invites by email
create table public.project_invitations (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  email text not null,
  invited_by uuid references public.profiles(id) on delete cascade not null,
  token text not null unique,
  expires_at timestamp with time zone not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.project_invitations enable row level security;

create policy "Project owner and members can view invitations"
  on public.project_invitations for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_invitations.project_id
      and (p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid()
      ))
    )
  );

create policy "Project owner can insert invitations"
  on public.project_invitations for insert
  with check (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  );

create policy "Project owner can update invitations"
  on public.project_invitations for update
  using (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  );

-- Invited user can set their pending invitation to accepted
create policy "Invited user can accept invitation"
  on public.project_invitations for update
  using (
    status = 'pending' and expires_at > now() and email = (select email from public.profiles where id = auth.uid())
  )
  with check (status = 'accepted');

create policy "Project owner can delete invitations"
  on public.project_invitations for delete
  using (
    exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  );

-- Invited user can read their own pending invitation (for accept page)
create policy "Invited user can read own pending invitation"
  on public.project_invitations for select
  using (
    (status = 'pending' and expires_at > now() and email = (select email from public.profiles where id = auth.uid()))
    or
    exists (
      select 1 from public.projects p
      where p.id = project_invitations.project_id
      and (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()))
    )
  );

create index project_invitations_project_id_idx on public.project_invitations(project_id);
create index project_invitations_token_idx on public.project_invitations(token);
create unique index project_invitations_pending_email_idx on public.project_invitations(project_id, email) where (status = 'pending');

-- Invited user can add themselves to project_members when they have a pending invitation (must run after project_invitations exists)
create policy "Invited user can join with pending invitation"
  on public.project_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.project_invitations pi
      where pi.project_id = project_members.project_id
      and pi.email = (select email from public.profiles where id = auth.uid())
      and pi.status = 'pending'
      and pi.expires_at > now()
    )
  );

-- Returns invitation + project name by token (for accept page). Only pending, not expired.
create or replace function public.get_invitation_by_token(tok text)
returns table (id uuid, project_id uuid, project_name text, email text, expires_at timestamptz)
language sql security definer
set search_path = public
as $$
  select pi.id, pi.project_id, p.name, pi.email, pi.expires_at
  from public.project_invitations pi
  join public.projects p on p.id = pi.project_id
  where pi.token = tok and pi.status = 'pending' and pi.expires_at > now();
$$;


-- Allow reading profiles of users who share a project (for member list)
create policy "Users can view profiles in same project"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.projects p
      where (p.owner_id = auth.uid() or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()))
      and (p.owner_id = profiles.id or exists (select 1 from public.project_members pm2 where pm2.project_id = p.id and pm2.user_id = profiles.id))
    )
  );

-- Allow project members to view projects (in addition to owner)
drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own or member projects"
  on public.projects for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id and pm.user_id = auth.uid()
    )
  );

-- Allow project members to view/create/update/delete decisions
drop policy if exists "Users can view decisions from own projects" on public.decisions;
create policy "Users can view decisions from own or member projects"
  on public.decisions for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = decisions.project_id
      and (p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid()
      ))
    )
  );

drop policy if exists "Users can create decisions in own projects" on public.decisions;
create policy "Users can create decisions in own or member projects"
  on public.decisions for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
      and (p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid()
      ))
    )
  );

drop policy if exists "Users can update decisions in own projects" on public.decisions;
create policy "Users can update decisions in own or member projects"
  on public.decisions for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = decisions.project_id
      and (p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid()
      ))
    )
  );

drop policy if exists "Users can delete decisions in own projects" on public.decisions;
create policy "Users can delete decisions in own or member projects"
  on public.decisions for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = decisions.project_id
      and (p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid()
      ))
    )
  );
