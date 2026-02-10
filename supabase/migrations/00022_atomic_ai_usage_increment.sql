-- Atomic increment of AI usage: reserve one slot only if under plan limit.
-- Prevents race conditions (TOCTOU) and ensures limit is enforced under concurrent requests.
-- Call this BEFORE calling OpenAI; if it returns true, the slot is consumed.

create or replace function public.increment_ai_usage_if_allowed(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  p_period text;
  p_limit int;
  updated int;
begin
  p_period := to_char(current_date, 'YYYY-MM');
  select ai_generations_per_month into p_limit from get_plan_limits(p_user_id) limit 1;
  if p_limit is null then
    return false;
  end if;

  -- Ensure row exists for this user/period (idempotent)
  insert into public.ai_generations_usage (user_id, period, count)
  values (p_user_id, p_period, 0)
  on conflict (user_id, period) do nothing;

  -- Atomic increment only if under limit (or unlimited). UPDATE locks the row.
  if p_limit = -1 then
    update public.ai_generations_usage set count = count + 1
    where user_id = p_user_id and period = p_period;
    return true;
  else
    update public.ai_generations_usage set count = count + 1
    where user_id = p_user_id and period = p_period and count < p_limit;
    get diagnostics updated = row_count;
    return updated > 0;
  end if;
end;
$$;

comment on function public.increment_ai_usage_if_allowed(uuid) is
  'Increments AI generations usage for the user in the current month if under plan limit. Returns true if slot was reserved, false if limit reached. Call before OpenAI to enforce limits under concurrency.';
