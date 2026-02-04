-- Replace single pull_request_url with array pull_request_urls (multiple PRs)
alter table public.decisions
  add column if not exists pull_request_urls text[] default '{}';

-- Migrate existing single URL into array
update public.decisions
  set pull_request_urls = array[pull_request_url]
  where pull_request_url is not null and trim(pull_request_url) != '';

alter table public.decisions
  drop column if exists pull_request_url;

comment on column public.decisions.pull_request_urls is 'Optional array of URLs to pull requests associated with this decision';
