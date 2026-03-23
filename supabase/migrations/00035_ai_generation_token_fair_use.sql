-- Track AI decision generation fair-use by token usage (input/output) instead of request count.
-- Keeps legacy "count" column for historical compatibility and increments it on each successful call.

alter table public.ai_generations_usage
  add column if not exists input_tokens bigint not null default 0,
  add column if not exists output_tokens bigint not null default 0;

-- Atomic upsert: increment input/output token totals (and legacy count) for user/period.
create or replace function public.increment_ai_generation_usage_tokens(
  p_user_id uuid,
  p_period text,
  p_input_tokens bigint,
  p_output_tokens bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_input_tokens < 0 or p_output_tokens < 0 then
    return;
  end if;

  insert into public.ai_generations_usage (user_id, period, count, input_tokens, output_tokens)
  values (p_user_id, p_period, 1, p_input_tokens, p_output_tokens)
  on conflict (user_id, period) do update set
    count = public.ai_generations_usage.count + 1,
    input_tokens = public.ai_generations_usage.input_tokens + excluded.input_tokens,
    output_tokens = public.ai_generations_usage.output_tokens + excluded.output_tokens;
end;
$$;

comment on function public.increment_ai_generation_usage_tokens(uuid, text, bigint, bigint) is
  'Increments per-user per-month AI generation token usage totals and legacy call count.';
