import type { SupabaseClient } from "@supabase/supabase-js";

/** Current month in YYYY-MM for judge_usage.period */
export function getJudgeUsagePeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Increment judge token usage for the current month (called after each successful judge LLM call).
 * Uses RPC increment_judge_usage; safe to call with 0 tokens.
 */
export async function recordJudgeUsage(
  supabase: SupabaseClient,
  workspaceId: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  if (inputTokens < 0 || outputTokens < 0) return;
  const period = getJudgeUsagePeriod();
  await supabase.rpc("increment_judge_usage", {
    p_workspace_id: workspaceId,
    p_period: period,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
  });
}
