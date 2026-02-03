-- Aggiungi ruolo al profilo (es. Sviluppatore, Product Manager, Designer, Altro)
alter table public.profiles add column if not exists role text;

-- Aggiorna handle_new_user per copiare role da user metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'role'
  );
  return new;
end;
$$ language plpgsql security definer;
