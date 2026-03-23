-- Reduce monthly AI decision generation caps to align with lower fair-use budgets.
-- Team target ~2 EUR/month, Business target ~4 EUR/month (approximation via generation count).
-- Note: enforcement is currently count-based (ai_generations_per_month), not direct euro metering.

update public.plans
set
  ai_generations_per_month = 700,
  updated_at = now()
where id = 'team';

update public.plans
set
  ai_generations_per_month = 1400,
  updated_at = now()
where id = 'business';
