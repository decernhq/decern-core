-- Fix infinite recursion: the policy on project_members referenced project_members.
-- Use a SECURITY DEFINER function so the check runs without triggering RLS on project_members.

create or replace function public.can_view_project_members(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects where id = p_project_id and owner_id = p_user_id
  )
  or exists (
    select 1 from public.project_members where project_id = p_project_id and user_id = p_user_id
  );
$$;

drop policy if exists "Project owner and members can view project_members" on public.project_members;

create policy "Project owner and members can view project_members"
  on public.project_members for select
  using (public.can_view_project_members(project_id, auth.uid()));
