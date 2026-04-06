-- Update plan prices: Team EUR 29/mo, Business EUR 149/mo.
update public.plans
set price_cents = 2900, updated_at = now()
where id = 'team';

update public.plans
set price_cents = 14900, updated_at = now()
where id = 'business';
