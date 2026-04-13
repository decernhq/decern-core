-- Simplify workspace_policies: keep only evidence_retention_days.
--
-- The following fields were v1 policy knobs that the gate CLI never read
-- (the gate uses ADR frontmatter enforcement + env var DECERN_CONFIDENCE_THRESHOLD):
--   high_impact, require_linked_pr, require_approved,
--   judge_tolerance_percent, judge_mode
--
-- Dropping them removes a "control panel that controls nothing" from the UI.

ALTER TABLE public.workspace_policies
  DROP COLUMN IF EXISTS high_impact,
  DROP COLUMN IF EXISTS require_linked_pr,
  DROP COLUMN IF EXISTS require_approved,
  DROP COLUMN IF EXISTS judge_tolerance_percent,
  DROP COLUMN IF EXISTS judge_mode;
