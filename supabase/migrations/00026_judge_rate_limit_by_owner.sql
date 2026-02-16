-- Rate limit judge requests per owner (account) per minute to prevent abuse via multiple workspaces.
-- Buckets are per-minute; old buckets pruned on each check.

create table if not exists public.judge_rate_limit_by_owner (
  owner_id uuid references public.profiles(id) on delete cascade not null,
  bucket_ts timestamp with time zone not null,
  request_count int not null default 0,
  primary key (owner_id, bucket_ts)
);

comment on table public.judge_rate_limit_by_owner is 'Judge API rate limit: requests per owner (account) per minute, across all workspaces.';

alter table public.judge_rate_limit_by_owner enable row level security;

-- Increment count for current minute; delete buckets older than 1 hour; return true if under limit.
create or replace function public.check_and_increment_judge_rate_limit_by_owner(
  p_owner_id uuid,
  p_limit_per_minute int default 120
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_bucket timestamptz := date_trunc('minute', timezone('utc', now()));
  v_count int;
begin
  delete from public.judge_rate_limit_by_owner
  where bucket_ts < v_bucket - interval '1 hour';

  insert into public.judge_rate_limit_by_owner (owner_id, bucket_ts, request_count)
  values (p_owner_id, v_bucket, 1)
  on conflict (owner_id, bucket_ts) do update set
    request_count = public.judge_rate_limit_by_owner.request_count + 1;

  select request_count into v_count
  from public.judge_rate_limit_by_owner
  where owner_id = p_owner_id and bucket_ts = v_bucket;

  return v_count <= p_limit_per_minute;
end;
$$;
