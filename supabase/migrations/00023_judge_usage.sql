-- Judge (LLM) usage per workspace per month, for end-of-month Stripe billing.
-- Only written by the judge API (service role). Billed_at set when we charge the customer.

create table if not exists public.judge_usage (
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  period text not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  billed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (workspace_id, period),
  constraint judge_usage_period_format check (period ~ '^\d{4}-\d{2}$')
);

comment on table public.judge_usage is 'Token usage for Decision Gate Judge (Claude) per workspace per month (YYYY-MM). Billed at end of month via Stripe.';
comment on column public.judge_usage.period is 'YYYY-MM';
comment on column public.judge_usage.billed_at is 'When this period was charged on Stripe (null = not yet billed).';

alter table public.judge_usage enable row level security;

create index judge_usage_period_billed_idx on public.judge_usage(period, billed_at);

-- Upsert usage: increment tokens for (workspace_id, period). Called by judge route (service role).
create or replace function public.increment_judge_usage(
  p_workspace_id uuid,
  p_period text,
  p_input_tokens bigint,
  p_output_tokens bigint
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.judge_usage (workspace_id, period, input_tokens, output_tokens, updated_at)
  values (p_workspace_id, p_period, p_input_tokens, p_output_tokens, timezone('utc', now()))
  on conflict (workspace_id, period) do update set
    input_tokens = public.judge_usage.input_tokens + excluded.input_tokens,
    output_tokens = public.judge_usage.output_tokens + excluded.output_tokens,
    updated_at = timezone('utc', now());
end;
$$;
