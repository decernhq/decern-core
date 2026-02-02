-- Add external_links column to decisions
-- Stores array of {url, label} for external references (RFCs, docs, etc.)

alter table public.decisions
  add column if not exists external_links jsonb default '[]'::jsonb;

comment on column public.decisions.external_links is 'Array of {url: string, label?: string} for external references';
