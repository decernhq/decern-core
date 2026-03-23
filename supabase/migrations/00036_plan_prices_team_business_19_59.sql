-- List prices: Team EUR 19/mo, Business EUR 59/mo (was 49 / 99 in 00020).

update public.plans
set
  price_cents = 1900,
  updated_at = now()
where id = 'team';

update public.plans
set
  price_cents = 5900,
  updated_at = now()
where id = 'business';
