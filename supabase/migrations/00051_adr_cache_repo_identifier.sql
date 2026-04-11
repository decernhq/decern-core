-- Multi-repo support for adr_cache and case_c_signals.
--
-- A single workspace can host multiple repos, each with its own /docs/adr/ tree.
-- Before this migration, adr_cache used PK (workspace_id, id), so two repos with
-- ADR-001 would collide on sync. Now the per-repo identifier becomes part of the
-- PK and the signals table, so the dashboard and drift report can scope by repo.
--
-- repository_identifier format: "<host>/<owner>/<repo>" (e.g. "github.com/acme/api"),
-- matching what evidence_records.repository_identifier already stores via
-- gate/src/ci-metadata.ts collectCiMetadata().
--
-- Data policy: no production customers yet, so we drop and recreate rather than
-- backfill with a sentinel. This keeps the schema honest (NOT NULL from day one).

TRUNCATE TABLE public.adr_cache;
TRUNCATE TABLE public.case_c_signals;

ALTER TABLE public.adr_cache
  DROP CONSTRAINT IF EXISTS adr_cache_pkey;

ALTER TABLE public.adr_cache
  ADD COLUMN repository_identifier text NOT NULL;

ALTER TABLE public.adr_cache
  ADD CONSTRAINT adr_cache_pkey PRIMARY KEY (workspace_id, repository_identifier, id);

COMMENT ON COLUMN public.adr_cache.repository_identifier IS
  'Fully-qualified repo (e.g. github.com/acme/api), matching evidence_records.repository_identifier.';

ALTER TABLE public.case_c_signals
  ADD COLUMN repository_identifier text NOT NULL;

DROP INDEX IF EXISTS case_c_signals_workspace_ts;

CREATE INDEX case_c_signals_workspace_repo_ts
  ON public.case_c_signals(workspace_id, repository_identifier, created_at DESC);

COMMENT ON COLUMN public.case_c_signals.repository_identifier IS
  'Fully-qualified repo the signal came from (e.g. github.com/acme/api).';
