-- Fix: the UPDATE policy on decisions was missing the approval role check.
-- Contributors could change status to 'approved'/'rejected' directly via
-- the Supabase client, bypassing the server action enforcement.
-- This adds the same approval guard that the INSERT policy already has.

drop policy if exists "Users can update decisions in their workspace" on public.decisions;

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
        and (
          not public.workspace_roles_enabled_for_workspace(p.workspace_id)
          or public.can_approve_workspace_decisions(p.workspace_id, auth.uid())
          or status not in ('approved', 'rejected')
        )
    )
  );
