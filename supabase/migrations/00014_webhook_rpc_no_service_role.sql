-- Permette al webhook Stripe di aggiornare le subscription senza usare la service role in Next.js.
-- Il webhook chiama queste RPC con la anon key passando SUPABASE_WEBHOOK_SECRET (stesso valore in .env).
-- Setup: dopo la migration, in Supabase SQL Editor esegui "select secret from app_webhook_secret"
-- e imposta quel valore in .env come SUPABASE_WEBHOOK_SECRET.

create table if not exists public.app_webhook_secret (
  id int primary key default 1,
  secret text not null,
  constraint single_row check (id = 1)
);

insert into public.app_webhook_secret (secret)
values (md5(gen_random_uuid()::text || clock_timestamp()::text))
on conflict (id) do nothing;

revoke all on public.app_webhook_secret from anon, authenticated;
-- Solo le funzioni security definer possono leggere la tabella (usano search_path public)

create or replace function public.stripe_webhook_checkout_completed(
  p_secret text,
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_plan_id plan_id,
  p_current_period_end timestamptz
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_secret text;
begin
  select secret into v_secret from public.app_webhook_secret where id = 1;
  if v_secret is null or v_secret <> p_secret then
    return;
  end if;
  update public.subscriptions
  set
    stripe_subscription_id = p_stripe_subscription_id,
    stripe_customer_id = p_stripe_customer_id,
    plan_id = p_plan_id,
    status = 'active',
    current_period_end = p_current_period_end
  where user_id = p_user_id;
  if not found then
    insert into public.subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan_id, status, current_period_end)
    values (p_user_id, p_stripe_customer_id, p_stripe_subscription_id, p_plan_id, 'active', p_current_period_end)
    on conflict (user_id) do update set
      stripe_subscription_id = excluded.stripe_subscription_id,
      stripe_customer_id = excluded.stripe_customer_id,
      plan_id = excluded.plan_id,
      status = excluded.status,
      current_period_end = excluded.current_period_end;
  end if;
end;
$$;

create or replace function public.stripe_webhook_subscription_updated(
  p_secret text,
  p_stripe_customer_id text,
  p_plan_id plan_id,
  p_status subscription_status,
  p_current_period_end timestamptz
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_secret text;
begin
  select secret into v_secret from public.app_webhook_secret where id = 1;
  if v_secret is null or v_secret <> p_secret then
    return;
  end if;
  update public.subscriptions
  set plan_id = p_plan_id, status = p_status, current_period_end = p_current_period_end
  where stripe_customer_id = p_stripe_customer_id;
end;
$$;

create or replace function public.stripe_webhook_subscription_deleted(
  p_secret text,
  p_stripe_customer_id text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_secret text;
begin
  select secret into v_secret from public.app_webhook_secret where id = 1;
  if v_secret is null or v_secret <> p_secret then
    return;
  end if;
  update public.subscriptions
  set stripe_subscription_id = null, plan_id = 'free', status = 'active', current_period_end = null
  where stripe_customer_id = p_stripe_customer_id;
end;
$$;

create or replace function public.stripe_webhook_payment_failed(
  p_secret text,
  p_stripe_customer_id text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_secret text;
begin
  select secret into v_secret from public.app_webhook_secret where id = 1;
  if v_secret is null or v_secret <> p_secret then
    return;
  end if;
  update public.subscriptions
  set status = 'past_due'
  where stripe_customer_id = p_stripe_customer_id;
end;
$$;

create or replace function public.stripe_webhook_invoice_paid(
  p_secret text,
  p_stripe_customer_id text,
  p_plan_id plan_id,
  p_current_period_end timestamptz
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_secret text;
begin
  select secret into v_secret from public.app_webhook_secret where id = 1;
  if v_secret is null or v_secret <> p_secret then
    return;
  end if;
  update public.subscriptions
  set plan_id = p_plan_id, status = 'active', current_period_end = p_current_period_end
  where stripe_customer_id = p_stripe_customer_id;
end;
$$;

grant execute on function public.stripe_webhook_checkout_completed to anon;
grant execute on function public.stripe_webhook_subscription_updated to anon;
grant execute on function public.stripe_webhook_subscription_deleted to anon;
grant execute on function public.stripe_webhook_payment_failed to anon;
grant execute on function public.stripe_webhook_invoice_paid to anon;
