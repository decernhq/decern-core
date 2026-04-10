-- Unify judge_blocking + judge_mode into a single judge_mode column.
-- New values: 'blocking' | 'advisory' | 'deterministic_only'

-- Step 1: Drop the OLD constraint first (only allowed 'advisory' and 'deterministic_only')
ALTER TABLE public.workspace_policies DROP CONSTRAINT IF EXISTS workspace_policies_judge_mode_check;

-- Step 2: Add the NEW constraint that allows all 3 values
ALTER TABLE public.workspace_policies ADD CONSTRAINT workspace_policies_judge_mode_check
  CHECK (judge_mode IN ('blocking', 'advisory', 'deterministic_only'));

-- Step 3: Migrate existing data based on judge_blocking
UPDATE public.workspace_policies
SET judge_mode = CASE
  WHEN judge_blocking = false THEN 'advisory'
  WHEN judge_blocking = true AND judge_mode = 'advisory' THEN 'blocking'
  WHEN judge_blocking = true AND judge_mode = 'deterministic_only' THEN 'deterministic_only'
  ELSE 'blocking'
END;

-- Step 4: Set default to 'blocking'
ALTER TABLE public.workspace_policies ALTER COLUMN judge_mode SET DEFAULT 'blocking';
