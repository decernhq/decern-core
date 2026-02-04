-- Token CI per workspace (Decision Gate): un token per workspace, salvato come hash
alter table public.workspaces
  add column if not exists ci_token_hash text,
  add column if not exists ci_token_created_at timestamp with time zone;

comment on column public.workspaces.ci_token_hash is 'SHA-256 hash of the CI token for Decision Gate API (one per workspace)';
comment on column public.workspaces.ci_token_created_at is 'When the current CI token was generated';

create index if not exists workspaces_ci_token_hash_idx on public.workspaces(ci_token_hash)
  where ci_token_hash is not null;
