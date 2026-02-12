-- Rate limit judge requests per workspace per minute to prevent abuse (unbounded Anthropic cost).
-- Buckets are per-minute; old buckets pruned on each check to avoid table growth.

create table if not exists public.judge_rate_limit (
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  bucket_ts timestamp with time zone not null,
  request_count int not null default 0,
  primary key (workspace_id, bucket_ts)
);

comment on table public.judge_rate_limit is 'Judge API rate limit: requests per workspace per minute.';

alter table public.judge_rate_limit enable row level security;

-- Increment count for current minute; delete buckets older than 1 hour; return true if under limit.
create or replace function public.check_and_increment_judge_rate_limit(
  p_workspace_id uuid,
  p_limit_per_minute int default 60
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_bucket timestamptz := date_trunc('minute', timezone('utc', now()));
  v_count int;
begin
  delete from public.judge_rate_limit
  where bucket_ts < v_bucket - interval '1 hour';

  insert into public.judge_rate_limit (workspace_id, bucket_ts, request_count)
  values (p_workspace_id, v_bucket, 1)
  on conflict (workspace_id, bucket_ts) do update set
    request_count = public.judge_rate_limit.request_count + 1;

  select request_count into v_count
  from public.judge_rate_limit
  where workspace_id = p_workspace_id and bucket_ts = v_bucket;

  return v_count <= p_limit_per_minute;
end;
$$;
