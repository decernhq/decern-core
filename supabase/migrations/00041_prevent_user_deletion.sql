-- Prevent user deletion from app code.
-- Deleting an owner cascades and destroys the entire workspace data for all members.
-- Only allow deletion from the Supabase dashboard (supabase_auth_admin)
-- or direct SQL (postgres/supabase_admin).

create or replace function public.prevent_profile_deletion()
returns trigger
language plpgsql
as $$
begin
  if session_user not in ('postgres', 'supabase_admin', 'supabase_auth_admin') then
    raise exception 'User deletion is not allowed from the application. Use the Supabase dashboard.';
  end if;
  return old;
end;
$$;

create trigger trg_prevent_profile_deletion
  before delete on public.profiles
  for each row
  execute function public.prevent_profile_deletion();
