-- Drop legacy v1 tables: judge_gate_runs and judge_usage.
-- v2 uses evidence_records as the source of truth for gate runs.
-- Token usage tracking is no longer needed since LLM is always BYO (client-side).

DROP TABLE IF EXISTS public.judge_gate_runs CASCADE;
DROP TABLE IF EXISTS public.judge_usage CASCADE;

-- Also drop the RPC used by legacy rate limiting
DROP FUNCTION IF EXISTS public.check_and_increment_judge_rate_limit(uuid, integer);
DROP FUNCTION IF EXISTS public.check_and_increment_judge_rate_limit_by_owner(uuid, integer);
DROP FUNCTION IF EXISTS public.increment_judge_usage(uuid, text, integer, integer);
