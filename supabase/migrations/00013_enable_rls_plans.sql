-- RLS su plans: lettura per tutti, modifiche solo via service role / migrazioni
alter table public.plans enable row level security;

create policy "Plans are readable by everyone"
  on public.plans for select
  using (true);
