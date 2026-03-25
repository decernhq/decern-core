-- Restrict project creation in role-enabled workspaces:
-- viewers are read-only and cannot create projects.

create or replace function public.can_create_workspace_projects(
  p_workspace_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.is_workspace_owner(p_workspace_id, p_user_id)
    or (
      public.can_view_workspace_members(p_workspace_id, p_user_id)
      and (
        not public.workspace_roles_enabled_for_workspace(p_workspace_id)
        or exists (
          select 1
          from public.workspace_members wm
          where wm.workspace_id = p_workspace_id
            and wm.user_id = p_user_id
            and wm.decision_role in ('contributor', 'approver')
        )
      )
    );
$$;

drop policy if exists "Users can create projects in their workspace" on public.projects;

create policy "Users can create projects in their workspace"
  on public.projects for insert
  with check (public.can_create_workspace_projects(workspace_id, auth.uid()));
