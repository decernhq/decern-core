-- User-level BYO LLM settings for AI decision generation.
-- API keys are stored encrypted by the application before persisting.

create table if not exists public.user_ai_llm_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic')),
  base_url text not null,
  model text not null,
  encrypted_api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_ai_llm_settings is
  'BYO LLM configuration per user for AI generation. API key is stored encrypted.';

alter table public.user_ai_llm_settings enable row level security;

create policy "Users can view own LLM settings metadata"
  on public.user_ai_llm_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own LLM settings"
  on public.user_ai_llm_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own LLM settings"
  on public.user_ai_llm_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own LLM settings"
  on public.user_ai_llm_settings for delete
  using (auth.uid() = user_id);

drop trigger if exists update_user_ai_llm_settings_updated_at on public.user_ai_llm_settings;
create trigger update_user_ai_llm_settings_updated_at
  before update on public.user_ai_llm_settings
  for each row
  execute function public.update_updated_at_column();
