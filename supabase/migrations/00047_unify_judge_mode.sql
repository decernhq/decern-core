-- Unify judge_blocking + judge_mode into a single judge_mode column.
-- New values: 'blocking' | 'advisory' | 'deterministic_only'
--
-- Migration logic:
-- - judge_blocking=false → 'advisory'
-- - judge_blocking=true + judge_mode='advisory' → 'blocking'
-- - judge_blocking=true + judge_mode='deterministic_only' → 'deterministic_only'

-- First, migrate existing data
UPDATE public.workspace_policies
SET judge_mode = CASE
  WHEN judge_blocking = false THEN 'advisory'
  WHEN judge_blocking = true AND judge_mode = 'advisory' THEN 'blocking'
  WHEN judge_blocking = true AND judge_mode = 'deterministic_only' THEN 'deterministic_only'
  ELSE 'blocking'
END;

-- Update check constraint to allow 3 values
ALTER TABLE public.workspace_policies DROP CONSTRAINT IF EXISTS workspace_policies_judge_mode_check;
ALTER TABLE public.workspace_policies ADD CONSTRAINT workspace_policies_judge_mode_check
  CHECK (judge_mode IN ('blocking', 'advisory', 'deterministic_only'));

-- Set default to 'blocking' (enterprise default)
ALTER TABLE public.workspace_policies ALTER COLUMN judge_mode SET DEFAULT 'blocking';
