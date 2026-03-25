-- Workspace governance roles:
-- - workspace_role controls administration (admin/member)
-- - decision_role controls decision lifecycle permissions (approver/contributor/viewer)

alter table public.workspace_members
  add column if not exists workspace_role text not null default 'member',
  add column if not exists decision_role text not null default 'contributor';

alter table public.workspace_invitations
  add column if not exists workspace_role text not null default 'member',
  add column if not exists decision_role text not null default 'contributor';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_members'
      and column_name = 'role'
  ) then
    update public.workspace_members
    set
      workspace_role = case
        when role = 'admin' then 'admin'
        else 'member'
      end,
      decision_role = case
        when role = 'admin' then 'approver'
        when role = 'viewer' then 'viewer'
        else 'contributor'
      end;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_invitations'
      and column_name = 'role'
  ) then
    update public.workspace_invitations
    set
      workspace_role = case
        when role = 'admin' then 'admin'
        else 'member'
      end,
      decision_role = case
        when role = 'admin' then 'approver'
        when role = 'viewer' then 'viewer'
        else 'contributor'
      end;
  end if;
end $$;

alter table public.workspace_members
  drop constraint if exists workspace_members_workspace_role_check,
  drop constraint if exists workspace_members_decision_role_check,
  add constraint workspace_members_workspace_role_check
    check (workspace_role in ('admin', 'member')),
  add constraint workspace_members_decision_role_check
    check (decision_role in ('approver', 'contributor', 'viewer'));

alter table public.workspace_invitations
  drop constraint if exists workspace_invitations_workspace_role_check,
  drop constraint if exists workspace_invitations_decision_role_check,
  add constraint workspace_invitations_workspace_role_check
    check (workspace_role in ('admin', 'member')),
  add constraint workspace_invitations_decision_role_check
    check (decision_role in ('approver', 'contributor', 'viewer'));

create or replace function public.workspace_roles_enabled_for_workspace(p_workspace_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1
    from public.workspaces w
    left join public.subscriptions s on s.user_id = w.owner_id
    where w.id = p_workspace_id
      and coalesce(s.plan_id, 'free') in ('business', 'enterprise', 'governance', 'ultra')
  );
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.workspaces
    where id = p_workspace_id and owner_id = p_user_id
  );
$$;

create or replace function public.can_manage_workspace_members(p_workspace_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select public.is_workspace_owner(p_workspace_id, p_user_id)
  or exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = p_user_id
      and workspace_role = 'admin'
  );
$$;

create or replace function public.can_edit_workspace_decisions(p_workspace_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select public.is_workspace_owner(p_workspace_id, p_user_id)
  or exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = p_user_id
      and decision_role in ('approver', 'contributor')
  );
$$;

create or replace function public.can_approve_workspace_decisions(p_workspace_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select public.is_workspace_owner(p_workspace_id, p_user_id)
  or exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = p_user_id
      and decision_role = 'approver'
  );
$$;

drop policy if exists "Workspace owner can insert workspace_members" on public.workspace_members;
drop policy if exists "Owner can delete members, user can leave" on public.workspace_members;
drop policy if exists "Workspace owner/admin can insert workspace_members" on public.workspace_members;
drop policy if exists "Owner/admin can delete members, user can leave" on public.workspace_members;
drop policy if exists "Owner/admin can update workspace_members" on public.workspace_members;
drop policy if exists "Invited user can join with pending workspace invitation" on public.workspace_members;

create policy "Workspace owner/admin can insert workspace_members"
  on public.workspace_members for insert
  with check (
    public.is_workspace_owner(workspace_id, auth.uid())
    or (
      public.can_manage_workspace_members(workspace_id, auth.uid())
      and workspace_role = 'member'
      and decision_role in ('contributor', 'viewer')
    )
  );

create policy "Owner/admin can delete members, user can leave"
  on public.workspace_members for delete
  using (
    user_id = auth.uid()
    or public.is_workspace_owner(workspace_id, auth.uid())
    or (
      public.can_manage_workspace_members(workspace_id, auth.uid())
      and workspace_role = 'member'
      and decision_role <> 'approver'
    )
  );

create policy "Owner/admin can update workspace_members"
  on public.workspace_members for update
  using (
    public.is_workspace_owner(workspace_id, auth.uid())
    or (
      public.can_manage_workspace_members(workspace_id, auth.uid())
      and workspace_role = 'member'
      and decision_role <> 'approver'
    )
  )
  with check (
    public.is_workspace_owner(workspace_id, auth.uid())
    or (
      public.can_manage_workspace_members(workspace_id, auth.uid())
      and workspace_role = 'member'
      and decision_role in ('contributor', 'viewer')
    )
  );

create policy "Invited user can join with pending workspace invitation"
  on public.workspace_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workspace_invitations wi
      where wi.workspace_id = workspace_members.workspace_id
        and wi.email = (select email from public.profiles where id = auth.uid())
        and wi.status = 'pending'
        and wi.expires_at > now()
        and wi.workspace_role = workspace_members.workspace_role
        and wi.decision_role = workspace_members.decision_role
    )
  );

drop policy if exists "Workspace owner can insert workspace_invitations" on public.workspace_invitations;
drop policy if exists "Workspace owner can update workspace_invitations" on public.workspace_invitations;
drop policy if exists "Workspace owner can delete workspace_invitations" on public.workspace_invitations;
drop policy if exists "Workspace owner/admin can insert workspace_invitations" on public.workspace_invitations;
drop policy if exists "Workspace owner/admin can update workspace_invitations" on public.workspace_invitations;
drop policy if exists "Workspace owner/admin can delete workspace_invitations" on public.workspace_invitations;

create policy "Workspace owner/admin can insert workspace_invitations"
  on public.workspace_invitations for insert
  with check (
    invited_by = auth.uid()
    and (
      public.is_workspace_owner(workspace_id, auth.uid())
      or (
        public.can_manage_workspace_members(workspace_id, auth.uid())
        and workspace_role = 'member'
        and decision_role in ('contributor', 'viewer')
      )
    )
  );

create policy "Workspace owner/admin can update workspace_invitations"
  on public.workspace_invitations for update
  using (
    public.is_workspace_owner(workspace_id, auth.uid())
    or (
      public.can_manage_workspace_members(workspace_id, auth.uid())
      and workspace_role = 'member'
      and decision_role <> 'approver'
    )
  );

create policy "Workspace owner/admin can delete workspace_invitations"
  on public.workspace_invitations for delete
  using (
    public.is_workspace_owner(workspace_id, auth.uid())
    or (
      public.can_manage_workspace_members(workspace_id, auth.uid())
      and workspace_role = 'member'
      and decision_role <> 'approver'
    )
  );

drop policy if exists "Users can create decisions in their workspace" on public.decisions;
drop policy if exists "Users can update decisions in their workspace" on public.decisions;
drop policy if exists "Users can delete decisions in their workspace" on public.decisions;

create policy "Users can create decisions in their workspace"
  on public.decisions for insert
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (
          (
            not public.workspace_roles_enabled_for_workspace(p.workspace_id)
            and public.can_view_workspace_members(p.workspace_id, auth.uid())
          )
          or public.can_edit_workspace_decisions(p.workspace_id, auth.uid())
        )
        and (
          not public.workspace_roles_enabled_for_workspace(p.workspace_id)
          or public.can_approve_workspace_decisions(p.workspace_id, auth.uid())
          or status not in ('approved', 'rejected')
        )
    )
  );

create policy "Users can update decisions in their workspace"
  on public.decisions for update
  using (
    exists (
      select 1
      from public.projects p
      where p.id = decisions.project_id
        and (
          (
            not public.workspace_roles_enabled_for_workspace(p.workspace_id)
            and public.can_view_workspace_members(p.workspace_id, auth.uid())
          )
          or public.can_edit_workspace_decisions(p.workspace_id, auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = decisions.project_id
        and (
          (
            not public.workspace_roles_enabled_for_workspace(p.workspace_id)
            and public.can_view_workspace_members(p.workspace_id, auth.uid())
          )
          or public.can_edit_workspace_decisions(p.workspace_id, auth.uid())
        )
    )
  );

create policy "Users can delete decisions in their workspace"
  on public.decisions for delete
  using (
    exists (
      select 1
      from public.projects p
      where p.id = decisions.project_id
        and (
          (
            not public.workspace_roles_enabled_for_workspace(p.workspace_id)
            and public.can_view_workspace_members(p.workspace_id, auth.uid())
          )
          or public.can_edit_workspace_decisions(p.workspace_id, auth.uid())
        )
    )
  );

drop function if exists public.get_workspace_invitation_by_token(text);

create function public.get_workspace_invitation_by_token(tok text)
returns table (
  id uuid,
  workspace_id uuid,
  workspace_name text,
  email text,
  workspace_role text,
  decision_role text,
  expires_at timestamptz
)
language sql security definer set search_path = public as $$
  select wi.id, wi.workspace_id, w.name, wi.email, wi.workspace_role, wi.decision_role, wi.expires_at
  from public.workspace_invitations wi
  join public.workspaces w on w.id = wi.workspace_id
  where wi.token = tok and wi.status = 'pending' and wi.expires_at > now();
$$;
