-- When a Judge usage invoice fails payment, reset billed_at so the cron can retry.
-- Webhook invoice.payment_failed calls this when invoice.description matches 'Judge usage YYYY-MM'.

create or replace function public.stripe_webhook_judge_invoice_failed(
  p_secret text,
  p_stripe_customer_id text,
  p_period text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_secret text;
  v_user_id uuid;
begin
  select secret into v_secret from public.app_webhook_secret where id = 1;
  if v_secret is null or v_secret <> p_secret then
    return;
  end if;
  if p_period is null or p_period !~ '^\d{4}-\d{2}$' then
    return;
  end if;
  select user_id into v_user_id from public.subscriptions where stripe_customer_id = p_stripe_customer_id limit 1;
  if v_user_id is null then
    return;
  end if;
  update public.judge_usage
  set billed_at = null, updated_at = timezone('utc', now())
  where period = p_period
    and workspace_id in (select id from public.workspaces where owner_id = v_user_id);
end;
$$;

comment on function public.stripe_webhook_judge_invoice_failed is 'Resets judge_usage.billed_at for a customer/period so billing cron can retry after invoice.payment_failed.';

grant execute on function public.stripe_webhook_judge_invoice_failed to anon;
