/**
 * Judge usage tracking – stub for self-hosted / open-source mode.
 * Real implementation lives in cloud/lib/judge-usage.ts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export function getJudgeUsagePeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function recordJudgeUsage(
  _supabase: SupabaseClient,
  _workspaceId: string,
  _inputTokens: number,
  _outputTokens: number
): Promise<void> {
  // noop in self-hosted mode
}
