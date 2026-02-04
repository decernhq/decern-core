-- Add pull_request_url to decisions (optional link to PR)
alter table public.decisions
  add column if not exists pull_request_url text;

comment on column public.decisions.pull_request_url is 'Optional URL to the pull request associated with this decision';
