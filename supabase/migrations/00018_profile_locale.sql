-- Add locale preference to profiles (e.g. 'en', 'it')
alter table public.profiles add column if not exists locale text default 'en';

comment on column public.profiles.locale is 'User preferred UI locale (e.g. en, it).';
