-- BYO LLM per-user API key storage is removed.
-- Self-hosted users configure LLM keys via environment variables instead.
drop table if exists public.user_ai_llm_settings cascade;
