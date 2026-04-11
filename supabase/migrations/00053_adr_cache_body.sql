-- Cache the full ADR markdown body (frontmatter + sections) alongside the
-- metadata, so the dashboard can render the Context / Decision / Consequences
-- without fetching the file from the repo.
--
-- Source of truth is still /docs/adr/*.md in the repo; this column is a cache
-- populated by `decern adr sync`. Nullable so that historical rows (synced
-- before this migration) stay readable; the next sync re-populates them.

ALTER TABLE public.adr_cache
  ADD COLUMN IF NOT EXISTS body text;

COMMENT ON COLUMN public.adr_cache.body IS
  'Raw ADR markdown (frontmatter + body). Cache; repo file is source of truth. Filled by POST /api/adr/sync.';
